'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMeeting } from '@/hooks/use-meeting';
import { useSocket } from '@/hooks/use-socket';
import { VideoGrid } from '@/components/meeting/video-grid';
import { MeetingControls } from '@/components/meeting/meeting-controls';
import { Calendar, Clock, Copy, Check, Users } from 'lucide-react';

export default function MeetingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const { meeting, isLoading, error } = useMeeting(roomId);

    const [userName, setUserName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [copied, setCopied] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [showParticipants, setShowParticipants] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isMediaReady, setIsMediaReady] = useState(false);

    // Socket connection
    const { participants: remoteParticipants } = useSocket(roomId, userName || 'Guest');

    useEffect(() => {
        setHasMounted(true);

        // Get user name from localStorage or prompt
        const savedName = localStorage.getItem('meeting_user_name');
        if (savedName) {
            setUserName(savedName);
            setHasJoined(true);
        } else {
            const name = prompt('Enter your name to join the meeting:') || 'Guest';
            setUserName(name);
            localStorage.setItem('meeting_user_name', name);
            setHasJoined(true);
        }
    }, []);

    // Initialize media devices (with better error handling)
    useEffect(() => {
        if (!hasJoined) return;

        const initMedia = async () => {
            try {
                // Try to get both video and audio
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setLocalStream(stream);
                setIsMediaReady(true);
            } catch (err: any) {
                console.warn('Could not get camera/mic:', err.name);

                if (err.name === 'AbortError' || err.name === 'NotReadableError') {
                    // Camera is busy, create a mock stream
                    console.log('Creating mock video stream...');
                    const mockStream = createMockVideoStream(userName);
                    setLocalStream(mockStream);
                    setIsMediaReady(true);
                } else if (err.name === 'NotAllowedError') {
                    // Permission denied
                    console.log('Permission denied, using audio only if possible');
                    try {
                        const audioOnly = await navigator.mediaDevices.getUserMedia({
                            video: false,
                            audio: true,
                        });
                        setLocalStream(audioOnly);
                        setIsVideoEnabled(false);
                        setIsMediaReady(true);
                    } catch {
                        // No audio either, mock stream only
                        setLocalStream(createMockVideoStream(userName));
                        setIsMediaReady(true);
                    }
                } else {
                    // Fallback: mock stream
                    setLocalStream(createMockVideoStream(userName));
                    setIsMediaReady(true);
                }
            }
        };

        initMedia();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [hasJoined, userName]);

    const createMockVideoStream = (name: string): MediaStream => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            if (!ctx) return;
            const hue = (Date.now() / 50) % 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(name, canvas.width / 2, canvas.height / 2);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#ddd';
            ctx.fillText('(Mock Video)', canvas.width / 2, canvas.height / 2 + 50);
            requestAnimationFrame(draw);
        };

        draw();
        return canvas.captureStream(30);
    };

    const handleToggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !isAudioEnabled;
                setIsAudioEnabled(!isAudioEnabled);
            }
        }
    };

    const handleToggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !isVideoEnabled;
                setIsVideoEnabled(!isVideoEnabled);
            }
        }
    };

    const handleEndCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        router.push('/meeting');
    };

    const handleCopyLink = async () => {
        const link = `${window.location.origin}/meeting/${roomId}`;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!hasMounted || !hasJoined) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Joining meeting...</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading meeting...</p>
                </div>
            </div>
        );
    }

    if (error || !meeting) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔴</div>
                    <h1 className="text-2xl font-semibold text-white mb-2">Meeting Not Found</h1>
                    <p className="text-gray-400 mb-6">The meeting you're looking for doesn't exist or has ended.</p>
                    <button
                        onClick={() => router.push('/meeting')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Meetings
                    </button>
                </div>
            </div>
        );
    }

    // Combine local participant with remote participants
    const allParticipants = [
        { id: 'local', name: userName, isAudioEnabled: isAudioEnabled, isVideoEnabled: isVideoEnabled, isHost: meeting.hostName === userName },
        ...remoteParticipants.map(p => ({
            id: p.userId,
            name: p.name,
            isAudioEnabled: true,
            isVideoEnabled: true,
            isHost: false,
        })),
    ];

    return (
        <div className="h-screen bg-gray-950 flex flex-col">
            {/* Meeting Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
                <div>
                    <h1 className="text-lg font-semibold text-white">{meeting.title || 'Meeting'}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                                {meeting.type === 'instant' ? 'Instant Meeting' :
                                    (hasMounted && meeting.scheduledTime ? new Date(meeting.scheduledTime).toLocaleDateString() : 'Scheduled Meeting')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Room ID: {meeting.roomId}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowParticipants(!showParticipants)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition relative"
                    >
                        <Users className="w-4 h-4" />
                        Participants
                        {remoteParticipants.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-blue-600 rounded-full text-xs">
                                {remoteParticipants.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex p-4 gap-4 min-h-0">
                {/* Video Grid */}
                <div className="flex-1">
                    {isMediaReady ? (
                        <VideoGrid
                            streams={remoteParticipants.map(p => ({
                                id: p.userId,
                                name: p.name,
                                stream: null,
                                isVideoEnabled: true,
                                isAudioEnabled: true,
                            }))}
                            localStream={localStream}
                            localName={userName}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-400">Initializing camera...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Participant List Sidebar */}
                {showParticipants && (
                    <div className="w-80 bg-gray-900 rounded-xl p-4 flex flex-col">
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-700">
                            <Users className="w-4 h-4 text-gray-400" />
                            <h3 className="font-medium text-white">
                                Participants ({allParticipants.length})
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {allParticipants.map((p) => (
                                <div key={p.id} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-white">
                                            {p.name}
                                            {p.isHost && (
                                                <span className="ml-2 text-xs bg-yellow-600 px-1.5 py-0.5 rounded">Host</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Meeting Controls */}
            <div className="p-4">
                <MeetingControls
                    isAudioEnabled={isAudioEnabled}
                    isVideoEnabled={isVideoEnabled}
                    onToggleAudio={handleToggleAudio}
                    onToggleVideo={handleToggleVideo}
                    onEndCall={handleEndCall}
                    onShareScreen={() => console.log('Share screen clicked')}
                    onToggleParticipants={() => setShowParticipants(!showParticipants)}
                    participantCount={allParticipants.length}
                />
            </div>
        </div>
    );
}