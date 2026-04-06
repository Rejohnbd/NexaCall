// frontend/src/hooks/use-webrtc.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface RemoteStream {
    userId: string;
    stream: MediaStream;
    name: string;
}

interface ParticipantInfo {
    userId: string;
    name: string;
}

export const useWebRTC = (
    socket: Socket | null,
    roomId: string,
    localStream: MediaStream | null,
    userName: string
) => {
    const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const participantsInfo = useRef<Map<string, string>>(new Map()); // Store participant names

    // STUN server configuration
    const configuration: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
    };

    // Create peer connection for a remote user
    const createPeerConnection = useCallback((remoteUserId: string, remoteName: string): RTCPeerConnection | undefined => {
        if (!localStream) {
            console.warn('Cannot create peer connection: localStream is not ready');
            return undefined;
        }

        const peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle incoming remote tracks
        peerConnection.ontrack = (event) => {
            console.log(`Received track from ${remoteUserId}`);
            setRemoteStreams(prev => {
                // Check if stream already exists
                const exists = prev.some(s => s.userId === remoteUserId);
                if (exists) {
                    return prev;
                }
                return [...prev, {
                    userId: remoteUserId,
                    stream: event.streams[0],
                    name: remoteName,
                }];
            });
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice-candidate', {
                    to: remoteUserId,
                    candidate: event.candidate,
                    roomId,
                });
            }
        };

        // Handle connection state
        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${remoteUserId}: ${peerConnection.connectionState}`);
            if (peerConnection.connectionState === 'failed') {
                console.log(`Connection failed with ${remoteUserId}, restarting ICE...`);
                peerConnection.restartIce();
            } else if (peerConnection.connectionState === 'connected') {
                console.log(`Successfully connected with ${remoteUserId}`);
            }
        };

        peerConnections.current.set(remoteUserId, peerConnection);
        participantsInfo.current.set(remoteUserId, remoteName);
        return peerConnection;
    }, [localStream, socket, roomId]);

    // Create and send offer to remote user
    const createOffer = useCallback(async (remoteUserId: string, remoteName: string) => {
        const peerConnection = createPeerConnection(remoteUserId, remoteName);
        if (!peerConnection) return;

        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket?.emit('offer', {
                to: remoteUserId,
                offer: offer,
                roomId,
            });

            console.log(`Offer sent to ${remoteUserId}`);
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }, [createPeerConnection, socket, roomId]);

    // Handle incoming offer
    const handleOffer = useCallback(async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
        // Get participant name from stored info or use default
        const fromName = participantsInfo.current.get(fromUserId) || 'Participant';

        let peerConnection = peerConnections.current.get(fromUserId);

        if (!peerConnection) {
            peerConnection = createPeerConnection(fromUserId, fromName);
            if (!peerConnection) return;
        }

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket?.emit('answer', {
                to: fromUserId,
                answer: answer,
                roomId,
            });

            console.log(`Answer sent to ${fromUserId}`);
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }, [createPeerConnection, socket, roomId]);

    // Handle incoming answer
    const handleAnswer = useCallback(async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
        const peerConnection = peerConnections.current.get(fromUserId);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                console.log(`Answer received from ${fromUserId}`);
            } catch (error) {
                console.error('Error handling answer:', error);
            }
        }
    }, []);

    // Handle ICE candidate
    const handleIceCandidate = useCallback(async (fromUserId: string, candidate: RTCIceCandidateInit) => {
        const peerConnection = peerConnections.current.get(fromUserId);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`ICE candidate added for ${fromUserId}`);
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    }, []);

    // Update participant name
    const updateParticipantName = useCallback((userId: string, name: string) => {
        participantsInfo.current.set(userId, name);
        // Update remote streams with new name
        setRemoteStreams(prev =>
            prev.map(stream =>
                stream.userId === userId
                    ? { ...stream, name: name }
                    : stream
            )
        );
    }, []);

    // Remove remote stream
    const removeRemoteStream = useCallback((userId: string) => {
        const peerConnection = peerConnections.current.get(userId);
        if (peerConnection) {
            peerConnection.close();
            peerConnections.current.delete(userId);
        }
        participantsInfo.current.delete(userId);
        setRemoteStreams(prev => prev.filter(s => s.userId !== userId));
        console.log(`Removed remote stream for ${userId}`);
    }, []);

    // Clean up all connections
    const cleanup = useCallback(() => {
        peerConnections.current.forEach((peerConnection) => {
            peerConnection.close();
        });
        peerConnections.current.clear();
        participantsInfo.current.clear();
        setRemoteStreams([]);
    }, []);

    // Set up socket event listeners
    useEffect(() => {
        if (!socket) return;

        const onOffer = (data: { from: string; offer: any }) => {
            console.log('Received offer from:', data.from);
            handleOffer(data.from, data.offer);
        };

        const onAnswer = (data: { from: string; answer: any }) => {
            console.log('Received answer from:', data.from);
            handleAnswer(data.from, data.answer);
        };

        const onIceCandidate = (data: { from: string; candidate: any }) => {
            console.log('Received ICE candidate from:', data.from);
            handleIceCandidate(data.from, data.candidate);
        };

        socket.on('offer', onOffer);
        socket.on('answer', onAnswer);
        socket.on('ice-candidate', onIceCandidate);

        return () => {
            socket.off('offer', onOffer);
            socket.off('answer', onAnswer);
            socket.off('ice-candidate', onIceCandidate);
            // Don't call cleanup() here as it might clear streams when socket context is still valid
            // instead call it when component unmounts
        };
    }, [socket, handleOffer, handleAnswer, handleIceCandidate]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        remoteStreams,
        createOffer,
        updateParticipantName,
        removeRemoteStream,
        cleanup,
    };
};