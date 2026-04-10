'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { Maximize2, Minimize2, MicOff, User } from 'lucide-react';

interface VideoStream {
  id: string;
  userId?: string;
  name: string;
  stream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  type?: 'camera' | 'screen';
}

interface VideoGridProps {
  streams: VideoStream[];
  localStream?: MediaStream | null;
  localName?: string;
  localVideoEnabled?: boolean;
  localAudioEnabled?: boolean;
}

export const VideoGrid = ({
  streams,
  localStream,
  localName = 'You',
  localVideoEnabled = true,
  localAudioEnabled = true,
}: VideoGridProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocalVideoReady, setIsLocalVideoReady] = useState(false);

  // Safe local video setup with error handling
  useEffect(() => {
    const videoElement = localVideoRef.current;
    if (!videoElement || !localStream) return;

    const setupVideo = async () => {
      try {
        videoElement.pause();
        videoElement.srcObject = null;
        videoElement.srcObject = localStream;
        setIsLocalVideoReady(true);
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            if (e.name !== 'AbortError') {
              console.warn(`Local video play error:`, e.name, e.message);
            }
          });
        }
      } catch (err) {
        console.warn('Local video setup error:', err);
        setIsLocalVideoReady(false);
      }
    };

    setupVideo();

    return () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
    };
  }, [localStream]);

  // Safe remote video setup
  const setupRemoteVideo = useCallback(
    (videoElement: HTMLVideoElement, stream: MediaStream) => {
      if (!videoElement || !stream) return;

      const tryPlay = () => {
        void videoElement.play().catch(() => { });
      };

      if (videoElement.srcObject !== stream) {
        videoElement.pause();
        videoElement.srcObject = null;
        videoElement.srcObject = stream;
      }

      tryPlay();
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener('unmute', tryPlay, { once: true });
      });
      videoElement.addEventListener('loadedmetadata', tryPlay, { once: true });
    },
    []
  );

  // Aggregate all streams
  const allStreams = useMemo(() => {
    const streamsList: VideoStream[] = [];

    // Local stream
    streamsList.push({
      id: 'local',
      name: localName,
      stream: localStream || null,
      isVideoEnabled: localVideoEnabled,
      isAudioEnabled: localAudioEnabled,
      type: 'camera',
    });

    // Remote streams
    for (const stream of streams) {
      if (stream.id !== 'local') {
        streamsList.push(stream);
      }
    }

    // Sort: Screen shares first, then cameras
    return streamsList.sort((a, b) => {
      if (a.type === 'screen' && b.type !== 'screen') return -1;
      if (a.type !== 'screen' && b.type === 'screen') return 1;
      return 0;
    });
  }, [localStream, streams, localName, localVideoEnabled, localAudioEnabled]);

  // Update remote video elements
  useEffect(() => {
    allStreams.forEach((stream) => {
      if (stream.id !== 'local' && stream.stream) {
        const videoEl = remoteVideoRefs.current.get(stream.id);
        if (videoEl) {
          setupRemoteVideo(videoEl, stream.stream);
        }
      }
    });
  }, [allStreams, setupRemoteVideo]);

  const participantCount = allStreams.length;
  const hasScreenShare = allStreams.some((s) => s.type === 'screen');

  // Dynamic Grid Class Calculation
  const getGridClass = () => {
    if (hasScreenShare) return 'grid-cols-1 lg:grid-cols-4 lg:grid-rows-2';

    if (participantCount === 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (participantCount === 2)
      return 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto';
    if (participantCount === 3)
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto';
    if (participantCount === 4) return 'grid-cols-2 max-w-5xl mx-auto';
    if (participantCount <= 6) return 'grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  // Render local video or placeholder
  const renderLocalVideo = () => {
    if (localStream && localVideoEnabled) {
      return (
        <>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isLocalVideoReady ? 'block' : 'hidden'} mirror`}
          />
          {!isLocalVideoReady && (
            <div className="w-full h-full flex items-center justify-center bg-[#202124]">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl">
                <span className="text-3xl font-bold text-white uppercase">
                  {localName?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          )}
        </>
      );
    }

    // Placeholder when video is off
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#202124]">
        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl">
          <span className="text-3xl font-bold text-white uppercase">
            {localName?.charAt(0) || 'U'}
          </span>
        </div>
      </div>
    );
  };

  // Render remote video or placeholder
  const renderRemoteVideo = (stream: VideoStream) => {
    if (stream.stream && stream.isVideoEnabled) {
      return (
        <video
          ref={(el) => {
            if (el) {
              remoteVideoRefs.current.set(stream.id, el);
              if (stream.stream && el.srcObject !== stream.stream) {
                setupRemoteVideo(el, stream.stream);
              }
            } else {
              remoteVideoRefs.current.delete(stream.id);
            }
          }}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          title={`${stream.name} video`}
          aria-label={`${stream.name} video`}
        />
      );
    }

    // Placeholder when video is off
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#202124]">
        <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center shadow-2xl">
          <span className="text-3xl font-bold text-white uppercase">
            {stream.name?.charAt(0) || 'U'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`grid gap-4 w-full h-full p-4 transition-all duration-500 overflow-y-auto content-center ${getGridClass()}`}
    >
      {allStreams.map((stream) => (
        <div
          key={stream.id}
          className={`relative bg-[#3c4043] rounded-xl overflow-hidden aspect-video group shadow-lg ring-1 ring-white/10 ${stream.type === 'screen'
            ? 'lg:col-span-3 lg:row-span-2'
            : 'col-span-1'
            }`}
        >
          {/* Video Element */}
          {stream.id === 'local'
            ? renderLocalVideo()
            : renderRemoteVideo(stream)}

          {/* Bottom Info Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm">
              <span className="truncate max-w-30 font-medium">
                {stream.name} {stream.id === 'local' && '(You)'}
              </span>
              {!stream.isAudioEnabled && (
                <MicOff className="w-3.5 h-3.5 text-red-400" />
              )}
            </div>
          </div>

          {/* Screen Share Badge */}
          {stream.type === 'screen' && (
            <div className="absolute top-3 left-3 bg-blue-600 px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg">
              PRESENTING
            </div>
          )}

          {/* Controls Overlay (Visible on Hover) */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-3 pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const videoElement =
                  stream.id === 'local'
                    ? localVideoRef.current
                    : remoteVideoRefs.current.get(stream.id);
                if (videoElement) toggleFullscreen(videoElement);
              }}
              className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white pointer-events-auto backdrop-blur-sm"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ))}

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
        .content-center {
          align-content: center;
        }
        @media (max-height: 500px) {
          .aspect-video {
            aspect-ratio: auto;
            height: 200px;
          }
        }
      `}</style>
    </div>
  );
};
