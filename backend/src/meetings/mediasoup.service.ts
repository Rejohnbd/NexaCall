import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mediasoup from 'mediasoup';

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
    private workers: mediasoup.types.Worker[] = [];
    private nextWorkerIdx = 0;
    private routers = new Map<string, mediasoup.types.Router>(); // roomId -> Router
    private transports = new Map<string, mediasoup.types.WebRtcTransport>(); // transportId -> Transport
    private producers = new Map<string, mediasoup.types.Producer>(); // producerId -> Producer
    private consumers = new Map<string, mediasoup.types.Consumer>(); // consumerId -> Consumer

    // Default MediaSoup configuration
    private readonly config = {
        worker: {
            rtcMinPort: 40000,
            rtcMaxPort: 40100,
            logLevel: 'debug' as const,
            logTags: [
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp',
            ] as const,
        },
        router: {
            mediaCodecs: [
                {
                    kind: 'audio' as const,
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video' as const,
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000,
                    },
                },
            ],
        },
        webRtcTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        },
    };

    async onModuleInit() {
        await this.createWorkers();
    }

    async onModuleDestroy() {
        for (const worker of this.workers) {
            worker.close();
        }
    }

    private async createWorkers() {
        const numWorkers = Object.keys(require('os').cpus()).length;
        console.log(`Creating ${numWorkers} MediaSoup workers...`);

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                rtcMinPort: this.config.worker.rtcMinPort,
                rtcMaxPort: this.config.worker.rtcMaxPort,
                logLevel: this.config.worker.logLevel,
                logTags: [...this.config.worker.logTags],
            });

            worker.on('died', () => {
                console.error('MediaSoup worker died, exiting in 2 seconds...', worker.pid);
                setTimeout(() => process.exit(1), 2000);
            });

            this.workers.push(worker);
        }
    }

    private getNextWorker(): mediasoup.types.Worker {
        const worker = this.workers[this.nextWorkerIdx];
        this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
        return worker;
    }

    async getOrCreateRouter(roomId: string): Promise<mediasoup.types.Router> {
        let router = this.routers.get(roomId);
        if (!router) {
            const worker = this.getNextWorker();
            router = await worker.createRouter({ mediaCodecs: [...this.config.router.mediaCodecs] });
            this.routers.set(roomId, router);
        }
        return router;
    }

    async createWebRtcTransport(roomId: string) {
        const router = await this.getOrCreateRouter(roomId);

        const transport = await router.createWebRtcTransport({
            ...this.config.webRtcTransport,
            initialAvailableOutgoingBitrate: 1000000,
        });

        this.transports.set(transport.id, transport);

        transport.on('dtlsstatechange', (dtlsState) => {
            if (dtlsState === 'closed') {
                transport.close();
            }
        });

        transport.on('@close', () => {
            this.transports.delete(transport.id);
        });

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    async connectTransport(transportId: string, dtlsParameters: any) {
        const transport = this.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        await transport.connect({ dtlsParameters });
    }

    async produce(transportId: string, kind: 'audio' | 'video', rtpParameters: any) {
        const transport = this.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const producer = await transport.produce({ kind, rtpParameters });
        this.producers.set(producer.id, producer);

        producer.on('transportclose', () => {
            producer.close();
            this.producers.delete(producer.id);
        });

        return producer;
    }

    async consume(roomId: string, transportId: string, producerId: string, rtpCapabilities: mediasoup.types.RtpCapabilities) {
        const router = await this.getOrCreateRouter(roomId);

        const transport = this.transports.get(transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const producer = this.producers.get(producerId);
        if (!producer) throw new Error(`Producer ${producerId} not found`);

        if (!router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error(`Cannot consume producer ${producerId}`);
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: true, // Consumer should start paused
        });

        this.consumers.set(consumer.id, consumer);

        consumer.on('transportclose', () => {
            consumer.close();
            this.consumers.delete(consumer.id);
        });

        consumer.on('producerclose', () => {
            consumer.close();
            this.consumers.delete(consumer.id);
        });

        return consumer;
    }

    async getRtpCapabilities(roomId: string): Promise<mediasoup.types.RtpCapabilities> {
        const router = await this.getOrCreateRouter(roomId);
        return router.rtpCapabilities;
    }

    getConsumer(consumerId: string): mediasoup.types.Consumer | undefined {
        return this.consumers.get(consumerId);
    }

    closeRoom(roomId: string) {
        const router = this.routers.get(roomId);
        if (router) {
            router.close();
            this.routers.delete(roomId);
        }
    }
}
