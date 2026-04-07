import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';

interface Participant {
    userId: string;
    name: string;
    roomId: string;
}

export const useSocket = (roomId: string, userName: string, shouldJoin: boolean = true) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const hasJoined = useRef(false);
    const mySocketId = useRef<string | null>(null);

    useEffect(() => {
        if (!roomId || !userName || !shouldJoin) return;

        const newSocket = io(`${SOCKET_URL}/meeting`, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        setSocket(newSocket);
        hasJoined.current = false;

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            mySocketId.current = newSocket.id || null;
            setIsConnected(true);

            if (!hasJoined.current) {
                hasJoined.current = true;
                newSocket.emit('join-room', { roomId, name: userName });
            }
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
            setParticipants([]);
            mySocketId.current = null;
        });

        newSocket.on('room-metadata', (data: { participants: Participant[], activeCount: number }) => {
            const currentId = mySocketId.current;
            if (!currentId) {
                console.log('Socket ID not set yet, skipping room-metadata');
                return;
            }
            console.log('Room metadata received:', data);
            console.log('All participants:', data.participants);
            console.log('My socket ID:', currentId);
            
            const filtered = data.participants.filter(p => p.userId !== currentId);
            console.log('Filtered participants (after removing self):', filtered);
            setParticipants(filtered);
        });

        newSocket.on('user-joined', (user: Participant) => {
            const currentId = mySocketId.current;
            if (!currentId) {
                console.log('Socket ID not set yet, skipping user-joined');
                return;
            }
            console.log('user-joined event - user:', user.userId, 'currentId:', currentId);
            if (user.userId === currentId) {
                console.log('Ignoring self in user-joined');
                return;
            }
            console.log('User joined:', user);

            setParticipants((prev) => {
                if (prev.some((p) => p.userId === user.userId)) return prev;
                return [...prev, user];
            });
        });

        newSocket.on('user-left', (data: { userId: string }) => {
            console.log('User left:', data.userId);
            setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
        });

        return () => {
            if (newSocket) {
                if (newSocket.connected) {
                    newSocket.emit('leave-room', { roomId });
                }
                newSocket.disconnect();
            }
            hasJoined.current = false;
            mySocketId.current = null;
        };
    }, [roomId, userName, shouldJoin]);

    return { socket, participants, isConnected };
};