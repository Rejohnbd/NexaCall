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
        });

        newSocket.on('existing-participants', (existingParticipants: Participant[]) => {
            console.log('Existing participants:', existingParticipants);
            // Filter out self
            const filtered = existingParticipants.filter(p => p.userId !== newSocket.id);
            setParticipants(filtered);
        });

        newSocket.on('user-joined', (user: Participant) => {
            console.log('User joined:', user);
            // Don't add self
            if (user.userId === newSocket.id) return;

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
            if (newSocket && newSocket.connected) {
                newSocket.emit('leave-room', { roomId });
                newSocket.disconnect();
            }
            hasJoined.current = false;
        };
    }, [roomId, userName, shouldJoin]);

    return { socket, participants, isConnected };
};