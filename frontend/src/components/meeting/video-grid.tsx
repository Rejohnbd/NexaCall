// frontend/src/components/meeting/video-grid.tsx
'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
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

  // Initialize local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
        if (videoEl && videoEl.srcObject !== stream.stream) {
          videoEl.srcObject = stream.stream;
          videoEl.play().catch((e) => console.warn('Play error:', e));
        }
      }
    });
  }, [allStreams]);

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

  return (
    <div
      ref={containerRef}
      className={`grid gap-4 w-full h-full p-4 transition-all duration-500 overflow-y-auto content-center ${getGridClass()}`}
    >
      {allStreams.map((stream) => (
        <div
          key={stream.id}
          className={`relative bg-[#3c4043] rounded-xl overflow-hidden aspect-video group shadow-lg ring-1 ring-white/10 ${
            stream.type === 'screen'
              ? 'lg:col-span-3 lg:row-span-2'
              : 'col-span-1'
          }`}
        >
          {/* Video Element */}
          {stream.isVideoEnabled ? (
            <video
              ref={(el) => {
                if (stream.id === 'local') {
                  (localVideoRef as any).current = el;
                } else if (el) {
                  remoteVideoRefs.current.set(stream.id, el);
                } else {
                  remoteVideoRefs.current.delete(stream.id);
                }

                if (el && stream.stream && el.srcObject !== stream.stream) {
                  el.srcObject = stream.stream;
                  el.play().catch((e) => console.warn('Play error:', e));
                }
              }}
              autoPlay
              playsInline
              muted={stream.id === 'local'}
              className={`w-full h-full object-cover ${stream.id === 'local' ? '' : ''}`}
            />
          ) : (
            /* Avatar/Placeholder when video is off */
            <div className="w-full h-full flex items-center justify-center bg-[#202124]">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl">
                <span className="text-3xl font-bold text-white uppercase">
                  {stream.name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          )}

          {/* Bottom Info Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm">
              <span className="truncate max-w-[120px] font-medium">
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
                const vid =
                  stream.id === 'local'
                    ? localVideoRef.current
                    : remoteVideoRefs.current.get(stream.id);
                if (vid) toggleFullscreen(vid);
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
