import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: 'meeting',
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private rooms = new Map<string, Set<string>>();
    private participants = new Map<string, { id: string; name: string; roomId: string }>();

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        const participant = this.participants.get(client.id);
        if (participant) {
            const roomId = participant.roomId;
            if (this.rooms.has(roomId)) {
                this.rooms.get(roomId)?.delete(client.id);
            }
            this.participants.delete(client.id);

            client.to(roomId).emit('user-left', { userId: client.id });
            console.log(`Client disconnected: ${client.id} from room ${roomId}`);
        }
    }

    @SubscribeMessage('join-room')
    handleJoinRoom(client: Socket, payload: { roomId: string; name: string }) {
        const { roomId, name } = payload;

        client.join(roomId);

        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId)?.add(client.id);

        this.participants.set(client.id, {
            id: client.id,
            name: name,
            roomId: roomId,
        });

        // Get existing participants
        const existingParticipants = Array.from(this.rooms.get(roomId) || [])
            .filter(socketId => socketId !== client.id)
            .map(socketId => this.participants.get(socketId))
            .filter(p => p !== undefined);

        client.emit('existing-participants', existingParticipants);

        client.to(roomId).emit('user-joined', {
            userId: client.id,
            name: name,
            roomId: roomId,
        });

        console.log(`${name} joined room: ${roomId}`);
    }

    @SubscribeMessage('leave-room')
    handleLeaveRoom(client: Socket, payload: { roomId: string }) {
        const { roomId } = payload;
        const participant = this.participants.get(client.id);

        if (participant) {
            this.rooms.get(roomId)?.delete(client.id);
            this.participants.delete(client.id);

            client.to(roomId).emit('user-left', { userId: client.id });
            client.leave(roomId);

            console.log(`${participant.name} left room: ${roomId}`);
        }
    }
}