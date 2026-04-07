// frontend/src/hooks/use-mediasoup.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { Device } from 'mediasoup-client';
import { Socket } from 'socket.io-client';

interface RemoteStream {
    id: string; // Unique combination of userId and producerId
    producerId: string;
    userId: string;
    stream: MediaStream;
    name: string;
    kind: 'audio' | 'video';
    type: 'camera' | 'screen';
}

export const useMediasoup = (
    socket: Socket | null,
    roomId: string,
    localStream: MediaStream | null,
    userName: string
) => {
    const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
    const deviceRef = useRef<Device | null>(null);
    const sendTransportRef = useRef<any>(null);
    const recvTransportRef = useRef<any>(null);
    const producersRef = useRef<Map<string, any>>(new Map()); // type -> producer
    const consumersRef = useRef<Map<string, any>>(new Map()); // producerId -> consumer
    const pendingProducers = useRef<any[]>([]);
    const [isReady, setIsReady] = useState(false);

    // Common function to consume a producer
    const consumeProducer = useCallback(async (data: { producerId: string; userId: string; kind: 'audio' | 'video'; appData: any }) => {
        if (!socket || data.userId === socket.id) return;

        if (!recvTransportRef.current || !deviceRef.current) {
            console.log('Transport not ready yet, buffering producer:', data.producerId);
            if (!pendingProducers.current.some(p => p.producerId === data.producerId)) {
                pendingProducers.current.push(data);
            }
            return;
        }

        if (consumersRef.current.has(data.producerId)) return;

        socket.emit('consume', {
            transportId: recvTransportRef.current.id,
            producerId: data.producerId,
            rtpCapabilities: deviceRef.current.rtpCapabilities,
        }, async (response: any) => {
            if (response.error) return;

            try {
                const consumer = await recvTransportRef.current.consume({
                    id: response.id,
                    producerId: response.producerId,
                    kind: response.kind,
                    rtpParameters: response.rtpParameters,
                });

                consumersRef.current.set(data.producerId, consumer);

                const stream = new MediaStream();
                stream.addTrack(consumer.track);

                // Resume consumer
                socket.emit('resumeConsumer', { consumerId: consumer.id });

                setRemoteStreams(prev => {
                    const type = data.appData?.type || 'camera';
                    const name = data.appData?.name || 'Participant';
                    const streamId = `${data.userId}-${data.producerId}`;

                    if (prev.some(s => s.producerId === data.producerId)) return prev;

                    return [...prev, {
                        id: streamId,
                        producerId: data.producerId,
                        userId: data.userId,
                        stream,
                        name: name,
                        kind: data.kind,
                        type: type,
                    }];
                });

                consumer.on('transportclose', () => closeConsumer(data.producerId));
                consumer.on('producerclose', () => closeConsumer(data.producerId));

            } catch (error) {
                console.error('Failed to create consumer:', error);
            }
        });
    }, [socket]);

    const closeConsumer = useCallback((producerId: string) => {
        const consumer = consumersRef.current.get(producerId);
        if (consumer) {
            consumer.close();
            consumersRef.current.delete(producerId);
        }
        setRemoteStreams(prev => prev.filter(s => s.producerId !== producerId));
    }, []);

    // Sync consumers with remoteStreams (Cleanup side effects)
    useEffect(() => {
        const activeProducerIds = new Set(remoteStreams.map(s => s.producerId));
        consumersRef.current.forEach((consumer, producerId) => {
            if (!activeProducerIds.has(producerId)) {
                consumer.close();
                consumersRef.current.delete(producerId);
            }
        });
    }, [remoteStreams]);

    // Initialize mediasoup device
    const initDevice = useCallback(async () => {
        if (!socket || deviceRef.current) return;

        // Reset state for new session
        setRemoteStreams([]);
        consumersRef.current.forEach(c => c.close());
        consumersRef.current.clear();

        socket.emit('getRouterRtpCapabilities', { roomId }, async (rtpCapabilities: any) => {
            if (rtpCapabilities.error) return;

            const device = new Device();
            await device.load({ routerRtpCapabilities: rtpCapabilities });
            deviceRef.current = device;

            socket.emit('createTransport', { roomId, type: 'send' }, async (data: any) => {
                const transport = device.createSendTransport(data);
                sendTransportRef.current = transport;

                transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                    socket.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, (resp: any) => {
                        if (resp.error) errback(resp.error); else callback();
                    });
                });

                transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                    socket.emit('produce', { roomId, transportId: transport.id, kind, rtpParameters, appData }, (resp: any) => {
                        if (resp.error) errback(resp.error); else callback({ id: resp.id });
                    });
                });

                if (localStream) {
                    const audioTrack = localStream.getAudioTracks()[0];
                    const videoTrack = localStream.getVideoTracks()[0];
                    if (audioTrack) {
                        const p = await transport.produce({ track: audioTrack, appData: { type: 'camera', name: userName } });
                        producersRef.current.set('audio', p);
                    }
                    if (videoTrack) {
                        const p = await transport.produce({ track: videoTrack, appData: { type: 'camera', name: userName } });
                        producersRef.current.set('video', p);
                    }
                }
            });

            socket.emit('createTransport', { roomId, type: 'recv' }, async (data: any) => {
                const transport = device.createRecvTransport(data);
                recvTransportRef.current = transport;
                transport.on('connect', ({ dtlsParameters }, callback, errback) => {
                    socket.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, (resp: any) => {
                        if (resp.error) errback(resp.error); else callback();
                    });
                });
                setIsReady(true);
            });
        });
    }, [socket, roomId, localStream, userName]);

    const produceScreenShare = useCallback(async (screenStream: MediaStream) => {
        if (!sendTransportRef.current) return;
        const track = screenStream.getVideoTracks()[0];
        if (!track) return;
        const producer = await sendTransportRef.current.produce({ track, appData: { type: 'screen', name: userName } });
        producersRef.current.set('screen', producer);
        producer.on('trackended', () => stopScreenShare());
        return producer;
    }, [userName]);

    const stopScreenShare = useCallback(() => {
        const producer = producersRef.current.get('screen');
        if (producer) {
            producer.close();
            producersRef.current.delete('screen');
            socket?.emit('producerClosed', { roomId, producerId: producer.id });
        }
    }, [socket, roomId]);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const handleNewProducer = (data: any) => {
            if (data.userId !== socket.id) consumeProducer(data);
        };
        const handleExistingProducers = (producers: any[]) => producers.forEach(p => {
            if (p.userId !== socket.id) consumeProducer(p);
        });
        const handleUserLeft = ({ userId }: { userId: string }) => {
            setRemoteStreams(prev => prev.filter(s => s.userId !== userId));
        };
        const handleRoomMetadata = (data: { producers: any[] }) => {
            const serverProducerIds = new Set(data.producers.map(p => p.producerId));
            setRemoteStreams(prev => {
                const filtered = prev.filter(s => serverProducerIds.has(s.producerId));
                return filtered;
            });
            data.producers.forEach(p => {
                if (p.userId !== socket.id && !consumersRef.current.has(p.producerId)) consumeProducer(p);
            });
        };

        socket.on('newProducer', handleNewProducer);
        socket.on('existingProducers', handleExistingProducers);
        socket.on('user-left', handleUserLeft);
        socket.on('room-metadata', handleRoomMetadata);

        return () => {
            socket.off('newProducer', handleNewProducer);
            socket.off('existingProducers', handleExistingProducers);
            socket.off('user-left', handleUserLeft);
            socket.off('room-metadata', handleRoomMetadata);
        };
    }, [socket, consumeProducer]);

    // Process pending producers
    useEffect(() => {
        if (isReady && pendingProducers.current.length > 0) {
            const producers = [...pendingProducers.current];
            pendingProducers.current = [];
            setTimeout(() => producers.forEach(p => consumeProducer(p)), 300);
        }
    }, [isReady, consumeProducer]);

    useEffect(() => { if (socket) initDevice(); }, [socket, initDevice]);

    useEffect(() => {
        return () => {
            producersRef.current.forEach(p => p.close());
            consumersRef.current.forEach(c => c.close());
            if (sendTransportRef.current) sendTransportRef.current.close();
            if (recvTransportRef.current) recvTransportRef.current.close();
        };
    }, []);

    return {
        remoteStreams,
        produceScreenShare,
        stopScreenShare,
        isMediasoupReady: isReady,
    };
};