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
  const [localProducerIds, setLocalProducerIds] = useState<string[]>([]);
  const [remoteProducerIds, setRemoteProducerIds] = useState<string[]>([]);
  const [pendingProducerCount, setPendingProducerCount] = useState<number>(0);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const producersRef = useRef<Map<string, any>>(new Map()); // type -> producer
  const consumersRef = useRef<Map<string, any>>(new Map()); // producerId -> consumer
  const pendingProducers = useRef<any[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Common function to consume a producer
  const consumeProducer = useCallback(
    async (data: {
      producerId: string;
      userId: string;
      kind: 'audio' | 'video';
      appData: any;
    }) => {
      if (!socket || data.userId === socket.id) return;

      if (!recvTransportRef.current || !deviceRef.current) {
        console.log(
          'Transport not ready yet, buffering producer:',
          data.producerId
        );
        if (
          !pendingProducers.current.some(
            (p) => p.producerId === data.producerId
          )
        ) {
          pendingProducers.current.push(data);
          setPendingProducerCount(pendingProducers.current.length);
        }
        return;
      }

      if (consumersRef.current.has(data.producerId)) return;

      socket.emit(
        'consume',
        {
          transportId: recvTransportRef.current.id,
          producerId: data.producerId,
          rtpCapabilities: deviceRef.current.rtpCapabilities,
        },
        async (response: any) => {
          if (response.error) {
            console.error('[useMediasoup] consume error:', response.error);
            return;
          }

          try {
            console.log('[useMediasoup] consume response:', response);
            const consumer = await recvTransportRef.current.consume({
              id: response.id,
              producerId: response.producerId,
              kind: response.kind,
              rtpParameters: response.rtpParameters,
            });

            consumersRef.current.set(data.producerId, consumer);
            setRemoteProducerIds((prev) =>
              prev.includes(data.producerId) ? prev : [...prev, data.producerId]
            );

            await new Promise<void>((resolve) => {
              socket.emit(
                'resumeConsumer',
                { consumerId: consumer.id },
                (r: { error?: string }) => {
                  if (r?.error) {
                    console.warn('[useMediasoup] resumeConsumer:', r.error);
                  }
                  resolve();
                }
              );
            });

            const stream = new MediaStream();
            stream.addTrack(consumer.track);

            setRemoteStreams((prev) => {
              const type = data.appData?.type || 'camera';
              const name = data.appData?.name || 'Participant';
              const streamId = `${data.userId}-${data.producerId}`;

              if (prev.some((s) => s.producerId === data.producerId))
                return prev;

              return [
                ...prev,
                {
                  id: streamId,
                  producerId: data.producerId,
                  userId: data.userId,
                  stream,
                  name: name,
                  kind: data.kind,
                  type: type,
                },
              ];
            });

            consumer.on('transportclose', () => closeConsumer(data.producerId));
            consumer.on('producerclose', () => closeConsumer(data.producerId));
          } catch (error) {
            console.error('Failed to create consumer:', error);
          }
        }
      );
    },
    [socket]
  );

  const closeConsumer = useCallback((producerId: string) => {
    const consumer = consumersRef.current.get(producerId);
    if (consumer) {
      consumer.close();
      consumersRef.current.delete(producerId);
    }
    setRemoteProducerIds((prev) => prev.filter((id) => id !== producerId));
    setRemoteStreams((prev) => prev.filter((s) => s.producerId !== producerId));
  }, []);

  // Initialize mediasoup device
  const initDevice = useCallback(async () => {
    if (!socket || deviceRef.current) return;

    // Reset state for new session
    setRemoteStreams([]);
    setLocalProducerIds([]);
    setRemoteProducerIds([]);
    setPendingProducerCount(0);
    consumersRef.current.forEach((c) => c.close());
    consumersRef.current.clear();

    socket.emit(
      'getRouterRtpCapabilities',
      { roomId },
      async (rtpCapabilities: any) => {
        if (rtpCapabilities.error) return;

        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;

        // Recv transport first so recvTransportRef/isReady are set before we produce
        // (produce triggers newProducer; peers must consume on a ready recv transport).
        try {
          await new Promise<void>((resolve, reject) => {
            socket.emit(
              'createTransport',
              { roomId, type: 'recv' },
              (data: any) => {
                if (data?.error) {
                  reject(new Error(data.error));
                  return;
                }
                try {
                  const transport = device.createRecvTransport(data);
                  recvTransportRef.current = transport;
                  transport.on(
                    'connect',
                    ({ dtlsParameters }, callback, errback) => {
                      socket.emit(
                        'connectTransport',
                        {
                          roomId,
                          transportId: transport.id,
                          dtlsParameters,
                        },
                        (resp: any) => {
                          if (resp.error) errback(resp.error);
                          else callback();
                        }
                      );
                    }
                  );

                  transport.on('connectionstatechange', (state) => {
                    console.log(`[use-mediasoup] Recv transport connection state: ${state}`);
                    if (state === 'failed') {
                      console.error('[use-mediasoup] Recv transport connection failed. Check UDP ports!');
                    }
                  });

                  transport.on('icegatheringstatechange', (state) => {
                    console.log(`[use-mediasoup] Recv transport ICE gathering state: ${state}`);
                  });
                  setIsReady(true);
                  resolve();
                } catch (e) {
                  reject(e);
                }
              }
            );
          });

          await new Promise<void>((resolve, reject) => {
            socket.emit(
              'createTransport',
              { roomId, type: 'send' },
              async (data: any) => {
                if (data?.error) {
                  reject(new Error(data.error));
                  return;
                }
                try {
                  const transport = device.createSendTransport(data);
                  sendTransportRef.current = transport;

                  transport.on(
                    'connect',
                    async ({ dtlsParameters }, callback, errback) => {
                      socket.emit(
                        'connectTransport',
                        {
                          roomId,
                          transportId: transport.id,
                          dtlsParameters,
                        },
                        (resp: any) => {
                          if (resp.error) errback(resp.error);
                          else callback();
                        }
                      );
                    }
                  );

                  transport.on('connectionstatechange', (state) => {
                    console.log(`[use-mediasoup] Send transport connection state: ${state}`);
                    if (state === 'failed') {
                      console.error('[use-mediasoup] Send transport connection failed. Check UDP ports!');
                    }
                  });

                  transport.on('icegatheringstatechange', (state) => {
                    console.log(`[use-mediasoup] Send transport ICE gathering state: ${state}`);
                  });

                  transport.on(
                    'produce',
                    async (
                      { kind, rtpParameters, appData },
                      callback,
                      errback
                    ) => {
                      socket.emit(
                        'produce',
                        {
                          roomId,
                          transportId: transport.id,
                          kind,
                          rtpParameters,
                          appData,
                        },
                        (resp: any) => {
                          if (resp.error) errback(resp.error);
                          else callback({ id: resp.id });
                        }
                      );
                    }
                  );

                  if (localStream) {
                    const audioTrack = localStream.getAudioTracks()[0];
                    const videoTrack = localStream.getVideoTracks()[0];
                    if (audioTrack) {
                      const p = await transport.produce({
                        track: audioTrack,
                        appData: { type: 'camera', name: userName },
                      });
                      producersRef.current.set('audio', p);
                      setLocalProducerIds((prev) =>
                        prev.includes('audio') ? prev : [...prev, 'audio']
                      );
                    }
                    if (videoTrack) {
                      const p = await transport.produce({
                        track: videoTrack,
                        appData: { type: 'camera', name: userName },
                      });
                      producersRef.current.set('video', p);
                      setLocalProducerIds((prev) =>
                        prev.includes('video') ? prev : [...prev, 'video']
                      );
                    }
                  }

                  resolve();
                } catch (e) {
                  reject(e);
                }
              }
            );
          });
        } catch (e) {
          console.error('[useMediasoup] init transports:', e);
        }
      }
    );
  }, [socket, roomId, localStream, userName]);

  const produceScreenShare = useCallback(
    async (screenStream: MediaStream) => {
      if (!sendTransportRef.current) return;
      const track = screenStream.getVideoTracks()[0];
      if (!track) return;
      const producer = await sendTransportRef.current.produce({
        track,
        appData: { type: 'screen', name: userName },
      });
      producersRef.current.set('screen', producer);
      producer.on('trackended', () => stopScreenShare());
      return producer;
    },
    [userName]
  );

  const stopScreenShare = useCallback(() => {
    const producer = producersRef.current.get('screen');
    if (producer) {
      producer.close();
      producersRef.current.delete('screen');
      socket?.emit('producerClosed', { roomId, producerId: producer.id });
    }
  }, [socket, roomId]);

  const produceLocalTracks = useCallback(async () => {
    if (!sendTransportRef.current || !localStream) return;

    try {
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];

      if (audioTrack && !producersRef.current.has('audio')) {
        const producer = await sendTransportRef.current.produce({
          track: audioTrack,
          appData: { type: 'camera', name: userName },
        });
        producersRef.current.set('audio', producer);
        setLocalProducerIds((prev) =>
          prev.includes('audio') ? prev : [...prev, 'audio']
        );
      }

      if (videoTrack && !producersRef.current.has('video')) {
        const producer = await sendTransportRef.current.produce({
          track: videoTrack,
          appData: { type: 'camera', name: userName },
        });
        producersRef.current.set('video', producer);
        setLocalProducerIds((prev) =>
          prev.includes('video') ? prev : [...prev, 'video']
        );
      }
    } catch (error) {
      console.error('[useMediasoup] produceLocalTracks error:', error);
    }
  }, [localStream, userName]);

  useEffect(() => {
    if (!localStream || !sendTransportRef.current) return;
    produceLocalTracks();
  }, [localStream, produceLocalTracks]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewProducer = (data: any) => {
      console.log('[useMediasoup] Received newProducer event:', data);
      if (data.userId !== socket.id) consumeProducer(data);
    };
    const handleExistingProducers = (producers: any[]) => {
      console.log(
        '[useMediasoup] Received existingProducers event:',
        producers
      );
      producers.forEach((p) => {
        if (p.userId !== socket.id) consumeProducer(p);
      });
    };
    const handleUserLeft = ({ userId }: { userId: string }) => {
      setRemoteStreams((prev) => {
        const leaving = prev.filter((s) => s.userId === userId);
        leaving.forEach((s) => {
          const c = consumersRef.current.get(s.producerId);
          if (c) {
            c.close();
            consumersRef.current.delete(s.producerId);
          }
        });
        if (leaving.length > 0) {
          const gone = new Set(leaving.map((s) => s.producerId));
          queueMicrotask(() =>
            setRemoteProducerIds((ids) => ids.filter((id) => !gone.has(id)))
          );
        }
        return prev.filter((s) => s.userId !== userId);
      });
    };
    const handleRoomMetadata = (data: { producers?: any[] }) => {
      const producers = data.producers;
      if (!Array.isArray(producers)) return;
      // Only ensure we consume missing producers. Do not filter remoteStreams here:
      // filtering raced with consume/getExistingProducers and closed live consumers.
      producers.forEach((p) => {
        if (p.userId !== socket.id && !consumersRef.current.has(p.producerId)) {
          consumeProducer(p);
        }
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
      setPendingProducerCount(0);
      setTimeout(() => producers.forEach((p) => consumeProducer(p)), 300);
    }
  }, [isReady, consumeProducer]);

  // Re-fetch producers when recv transport is ready — fixes race where `join-room`
  // triggered `existingProducers` / `room-metadata` before these listeners existed.
  useEffect(() => {
    if (!isReady || !socket) return;

    socket.emit(
      'getExistingProducers',
      { roomId },
      (resp: { producers?: any[]; error?: string }) => {
        if (!resp || resp.error || !Array.isArray(resp.producers)) return;
        resp.producers.forEach((p) => {
          if (p.userId !== socket.id) consumeProducer(p);
        });
      }
    );
  }, [isReady, socket, roomId, consumeProducer]);

  useEffect(() => {
    if (socket) initDevice();
  }, [socket, initDevice]);

  useEffect(() => {
    return () => {
      producersRef.current.forEach((p) => p.close());
      consumersRef.current.forEach((c) => c.close());
      if (sendTransportRef.current) sendTransportRef.current.close();
      if (recvTransportRef.current) recvTransportRef.current.close();
    };
  }, []);

  return {
    remoteStreams,
    produceScreenShare,
    stopScreenShare,
    isMediasoupReady: isReady,
    mediasoupDebug: {
      localProducerIds,
      remoteProducerIds,
      pendingProducerCount,
    },
  };
};
