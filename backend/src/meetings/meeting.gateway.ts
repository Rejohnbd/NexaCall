import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MediasoupService } from './mediasoup.service';

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
  private roomProducers = new Map<string, Array<{ producerId: string; userId: string; kind: string; appData: any }>>();

  constructor(private readonly mediasoupService: MediasoupService) { }

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

      // Notify others that user left
      client.to(roomId).emit('user-left', { userId: client.id });
      console.log(`Client disconnected: ${client.id} from room ${roomId}`);

      // Remove user's producers from roomProducers
      const producers = this.roomProducers.get(roomId);
      if (producers) {
        const updatedProducers = producers.filter(p => p.userId !== client.id);
        this.roomProducers.set(roomId, updatedProducers);
      }

      // If room is empty, clear mediasoup router and roomProducers
      if (this.rooms.get(roomId)?.size === 0) {
        this.mediasoupService.closeRoom(roomId);
        this.roomProducers.delete(roomId);
      } else {
        this.broadcastRoomMetadata(roomId);
      }
    }
  }

  private broadcastRoomMetadata(roomId: string) {
    const roomUsers = this.rooms.get(roomId);
    if (!roomUsers) return;

    const participants: any[] = [];
    roomUsers.forEach(userId => {
      const p = this.participants.get(userId);
      if (p) participants.push(p);
    });

    const producers = this.roomProducers.get(roomId) || [];

    this.server.to(roomId).emit('room-metadata', {
      roomId,
      participants,
      producers,
      activeCount: participants.length
    });
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(client: Socket, payload: { roomId: string; name: string }) {
    const { roomId, name } = payload;

    // Leave previous room if exists
    const existingParticipant = this.participants.get(client.id);
    if (existingParticipant) {
      client.leave(existingParticipant.roomId);
      if (this.rooms.has(existingParticipant.roomId)) {
        this.rooms.get(existingParticipant.roomId)?.delete(client.id);
        client.to(existingParticipant.roomId).emit('user-left', { userId: client.id });
      }
    }

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

    // Initialize MediaSoup Router for the room
    await this.mediasoupService.getOrCreateRouter(roomId);

    // Notify others about new user
    client.to(roomId).emit('user-joined', {
      userId: client.id,
      name: name,
    });

    console.log(`${name} (${client.id}) joined room: ${roomId}, total: ${this.rooms.get(roomId)?.size}`);

    // Send existing producers to the newly joined client
    const existingProducers = this.roomProducers.get(roomId) || [];
    if (existingProducers.length > 0) {
      client.emit('existingProducers', existingProducers);
    }

    // Broadcast updated metadata to everyone
    this.broadcastRoomMetadata(roomId);
  }

  /**
   * Pull-based sync for clients that missed `existingProducers` / `room-metadata`
   * (e.g. those events can fire before React attaches mediasoup listeners).
   */
  @SubscribeMessage('getExistingProducers')
  handleGetExistingProducers(
    client: Socket,
    payload: { roomId: string },
  ): { producers: Array<{ producerId: string; userId: string; kind: string; appData: any }> } | { error: string } {
    const participant = this.participants.get(client.id);
    if (!participant || participant.roomId !== payload.roomId) {
      return { error: 'Not in room' };
    }
    const producers = this.roomProducers.get(payload.roomId) || [];
    return { producers };
  }

  // --- MediaSoup SFU Signaling ---

  @SubscribeMessage('getRouterRtpCapabilities')
  async handleGetRtpCapabilities(client: Socket, payload: { roomId: string }) {
    try {
      const rtpCapabilities = await this.mediasoupService.getRtpCapabilities(payload.roomId);
      return rtpCapabilities;
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('createTransport')
  async handleCreateTransport(client: Socket, payload: { roomId: string }) {
    try {
      const transportData = await this.mediasoupService.createWebRtcTransport(payload.roomId);
      return transportData;
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('connectTransport')
  async handleConnectTransport(client: Socket, payload: { transportId: string; dtlsParameters: any }) {
    try {
      await this.mediasoupService.connectTransport(payload.transportId, payload.dtlsParameters);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('produce')
  async handleProduce(client: Socket, payload: { transportId: string; kind: any; rtpParameters: any; roomId: string; appData?: any }) {
    try {
      const producer = await this.mediasoupService.produce(payload.transportId, payload.kind, payload.rtpParameters);

      // Store producer info for new joiners
      if (!this.roomProducers.has(payload.roomId)) {
        this.roomProducers.set(payload.roomId, []);
      }
      this.roomProducers.get(payload.roomId)?.push({
        producerId: producer.id,
        userId: client.id,
        kind: payload.kind,
        appData: payload.appData,
      });

      // Notify others in the room about the new producer (legacy)
      client.to(payload.roomId).emit('newProducer', {
        producerId: producer.id,
        userId: client.id,
        kind: payload.kind,
        appData: payload.appData,
      });

      console.log(`[MeetingGateway] New producer created: producerId=${producer.id}, userId=${client.id}, kind=${payload.kind}, roomId=${payload.roomId}`);

      this.broadcastRoomMetadata(payload.roomId);

      return { id: producer.id };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('consume')
  async handleConsume(client: Socket, payload: { transportId: string; producerId: string; rtpCapabilities: any }) {
    try {
      const participant = this.participants.get(client.id);
      if (!participant) throw new Error('Participant not found');

      const consumer = await this.mediasoupService.consume(
        participant.roomId,
        payload.transportId,
        payload.producerId,
        payload.rtpCapabilities,
      );

      return {
        id: consumer.id,
        producerId: payload.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('producerClosed')
  handleProducerClosed(client: Socket, payload: { roomId: string; producerId: string }) {
    const producers = this.roomProducers.get(payload.roomId);
    if (producers) {
      const updated = producers.filter(p => p.producerId !== payload.producerId);
      this.roomProducers.set(payload.roomId, updated);
      this.broadcastRoomMetadata(payload.roomId);
    }
  }

  @SubscribeMessage('resumeConsumer')
  async handleResumeConsumer(client: Socket, payload: { consumerId: string }) {
    try {
      const consumer = this.mediasoupService.getConsumer(payload.consumerId);
      if (consumer) {
        await consumer.resume();
        console.log(`Consumer ${payload.consumerId} resumed`);
        return { success: true };
      }
      return { error: 'Consumer not found' };
    } catch (error) {
      return { error: error.message };
    }
  }

  // --- Legacy Mesh Signaling (to be removed later) ---

  @SubscribeMessage('offer')
  handleOffer(client: Socket, payload: { to: string; offer: any; roomId: string }) {
    client.to(payload.to).emit('offer', {
      from: client.id,
      offer: payload.offer,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(client: Socket, payload: { to: string; answer: any; roomId: string }) {
    client.to(payload.to).emit('answer', {
      from: client.id,
      answer: payload.answer,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(client: Socket, payload: { to: string; candidate: any; roomId: string }) {
    client.to(payload.to).emit('ice-candidate', {
      from: client.id,
      candidate: payload.candidate,
    });
  }
}
