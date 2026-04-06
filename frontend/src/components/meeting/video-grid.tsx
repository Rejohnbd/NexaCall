// frontend/src/components/meeting/video-grid.tsx
'use client';

import { useRef, useEffect, useMemo } from 'react';

interface VideoStream {
    id: string;
    name: string;
    stream: MediaStream | null;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
}

interface VideoGridProps {
    streams: VideoStream[];
    localStream?: MediaStream | null;
    localName?: string;
}

export const VideoGrid = ({ streams, localStream, localName = 'You' }: VideoGridProps) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

    // লোকাল ভিডিও স্ট্রিম সেট করা
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);


    // মক ভিডিও স্ট্রিম তৈরি করা (যখন কোনো স্ট্রিম পাওয়া যায় না)
    const getMockStream = (name: string): MediaStream => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        const animate = () => {
            if (!ctx) return;
            const hue = (Date.now() / 50) % 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(name, canvas.width / 2, canvas.height / 2);
            requestAnimationFrame(animate);
        };
        animate();

        return canvas.captureStream(30);
    };

    // সব ভিডিও স্ট্রিম (লোকাল + রিমোট) একটি অ্যারেতে জোগাড় করা, যাতে ডুপ্লিকেট না থাকে
    const allStreams = useMemo(() => {
        const streamsList: VideoStream[] = [];

        // লোকাল স্ট্রিম যোগ করা
        if (localStream) {
            streamsList.push({
                id: 'local',
                name: localName,
                stream: localStream,
                isVideoEnabled: true,
                isAudioEnabled: true,
            });
        }

        // রিমোট স্ট্রিম যোগ করা (ডুপ্লিকেট আইডি বাদ দিয়ে)
        const seenIds = new Set<string>();
        for (const stream of streams) {
            if (!seenIds.has(stream.id) && stream.id !== 'local') {
                seenIds.add(stream.id);
                streamsList.push({
                    ...stream,
                    stream: stream.stream || getMockStream(stream.name),
                });
            }
        }

        return streamsList;
    }, [localStream, streams, localName]);

    // রিমোট ভিডিও এলিমেন্টের রেফারেন্স আপডেট করা
    useEffect(() => {
        allStreams.forEach(stream => {
            if (stream.id !== 'local' && stream.stream) {
                const videoEl = remoteVideoRefs.current.get(stream.id);
                if (videoEl && videoEl.srcObject !== stream.stream) {
                    videoEl.srcObject = stream.stream;
                    videoEl.play().catch(e => console.log('Play error:', e));
                }
            }
        });
    }, [allStreams]);

    // গ্রিডের কলাম সংখ্যা নির্ধারণ
    const gridCols = allStreams.length === 1 ? 'grid-cols-1' :
        allStreams.length === 2 ? 'grid-cols-2' :
            allStreams.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

    return (
        <div className={`grid ${gridCols} gap-4 h-full`}>
            {allStreams.map((stream) => (
                // ✅ প্রতিটি এলিমেন্টের জন্য একটি ইউনিক key প্রপ দেওয়া আবশ্যক
                <div key={stream.id} className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
                    {/* লোকাল ভিডিও */}
                    {stream.id === 'local' ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        /* রিমোট ভিডিও */
                        <video
                            ref={(el) => {
                                if (el) {
                                    remoteVideoRefs.current.set(stream.id, el);
                                    if (stream.stream) {
                                        el.srcObject = stream.stream;
                                        el.play().catch(e => console.log('Play error:', e));
                                    }
                                } else {
                                    remoteVideoRefs.current.delete(stream.id);
                                }
                            }}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    )}

                    {/* ইউজারের নাম ও ব্যাজ */}
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-sm">
                        {stream.name}
                        {stream.id === 'local' && ' (You)'}
                    </div>

                    {/* মক ভিডিওর জন্য প্লেসহোল্ডার */}
                    {!stream.stream && stream.id !== 'local' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                                    <span className="text-2xl">{stream.name?.charAt(0) || '?'}</span>
                                </div>
                                <p className="text-white text-sm">Waiting for video...</p>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};