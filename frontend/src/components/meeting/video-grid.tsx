'use client';

import { useRef, useEffect, useState } from 'react';

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
    const [localEnabled, setLocalEnabled] = useState(true);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Create a mock video stream for demo (colorful background)
    const getMockStream = (name: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            const hue = (name.length * 100) % 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(name, canvas.width / 2, canvas.height / 2);
        }

        return canvas.captureStream();
    };

    const allStreams = [
        ...(localStream ? [{
            id: 'local',
            name: localName,
            stream: localStream,
            isVideoEnabled: true,
            isAudioEnabled: true,
        }] : []),
        ...streams.map(s => ({
            ...s,
            stream: s.stream || getMockStream(s.name),
        })),
    ];

    const gridCols = allStreams.length === 1 ? 'grid-cols-1' :
        allStreams.length === 2 ? 'grid-cols-2' :
            allStreams.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

    return (
        <div className={`grid ${gridCols} gap-4 h-full`}>
            {allStreams.map((stream) => (
                <div key={stream.id} className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
                    <video
                        ref={(el) => {
                            if (el && stream.stream) {
                                el.srcObject = stream.stream;
                                el.play().catch(e => console.log('Play failed:', e));
                            }
                        }}
                        autoPlay
                        playsInline
                        muted={stream.id === 'local'}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                        {stream.name}
                        {stream.id === 'local' && ' (You)'}
                    </div>
                </div>
            ))}
        </div>
    );
};