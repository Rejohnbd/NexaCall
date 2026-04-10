import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

// Dynamic URL detection to work across different IPs/devices
const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // In production/SSL environment, we use the same host via Nginx
    if (protocol === 'https:' || hostname !== 'localhost') {
       const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
       return process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}//${hostname}`;
    }
    // Fallback for local development without Nginx
    return process.env.NEXT_PUBLIC_WS_URL || `http://localhost:8000`;
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';
};

const SOCKET_URL = getSocketUrl();

interface Participant {
    id: string;      // From server
    userId?: string; // For frontend compatibility
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
            const currentId = newSocket.id;
            if (!currentId) {
                console.warn('[use-socket] Room metadata received but socket.id is missing');
                return;
            }
            
            mySocketId.current = currentId;

            // Map server side 'id' to 'userId' for consistency
            const normalizedParticipants = data.participants.map(p => ({
                ...p,
                userId: p.id || p.userId // Ensure we have a userId
            }));

            const filtered = normalizedParticipants.filter(p => {
                if (!p || !p.userId) return false;
                
                // Normalize IDs by removing socket.io namespace prefixes (e.g., /meeting#)
                const stripNamespace = (id: string) => (id && id.includes('#')) ? id.split('#').pop() : id;
                const pId = stripNamespace(p.userId);
                const sId = stripNamespace(currentId);
                
                const isSelf = pId === sId;
                return !isSelf;
            });
            
            console.log('[use-socket] Filtered participants:', filtered.map(p => p.name));
            setParticipants(filtered);
        });

        newSocket.on('user-joined', (user: Participant) => {
            const currentId = mySocketId.current;
            if (!currentId) return;

            // Normalize
            const userId = user.id || user.userId;
            
            if (userId === currentId) return;

            setParticipants((prev) => {
                const existing = prev.find(p => p.id === user.id || p.userId === userId);
                if (existing) return prev;
                return [...prev, { ...user, userId }];
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