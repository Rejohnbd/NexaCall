'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMeeting } from '@/hooks/use-meeting';
import { useSocket } from '@/hooks/use-socket';
import { useMediasoup } from '@/hooks/use-mediasoup';
import { useScreenShare } from '@/hooks/use-screen-share';
import { VideoGrid } from '@/components/meeting/video-grid';
import { MeetingControls } from '@/components/meeting/meeting-controls';
import {
  Calendar,
  Clock,
  Copy,
  Check,
  Users,
  X,
  Info,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

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
  const [activeSidebar, setActiveSidebar] = useState<
    'participants' | 'chat' | null
  >(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);

  // Socket connection - Delayed until media is ready
  const {
    socket,
    participants: remoteParticipants,
    isConnected,
  } = useSocket(roomId, userName, isMediaReady);

  // MediaSoup SFU
  const {
    remoteStreams,
    produceScreenShare,
    stopScreenShare: stopMediasoupScreenShare,
    isMediasoupReady,
    mediasoupDebug,
  } = useMediasoup(socket, roomId, localStream, userName);

  // Screen Share Hook
  const {
    isSharing,
    screenStream,
    startScreenShare,
    stopScreenShare: stopLocalScreenShare,
  } = useScreenShare();

  useEffect(() => {
    setHasMounted(true);
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

  // Handle Screen Sharing Production
  useEffect(() => {
    if (screenStream && isMediasoupReady) {
      produceScreenShare(screenStream);
    }
  }, [screenStream, isMediasoupReady, produceScreenShare]);

  const handleToggleScreenShare = async () => {
    if (isSharing) {
      stopLocalScreenShare();
      stopMediasoupScreenShare();
      socket?.emit('producerClosed', { roomId, producerId: 'screen' });
    } else {
      const stream = await startScreenShare();
      if (stream) {
        // Production handled by useEffect above
      }
    }
  };

  // Initialize media devices
  useEffect(() => {
    if (!hasJoined) return;

    let active = true;
    let newStream: MediaStream | null = null;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        newStream = stream;
        setLocalStream(stream);
        setIsMediaReady(true);
      } catch (err: any) {
        if (!active) return;
        console.warn('Could not get camera/mic, using mock stream');
        const mockStream = createMockVideoStream(userName);
        newStream = mockStream;
        setLocalStream(mockStream);
        setIsMediaReady(true);
      }
    };

    initMedia();

    return () => {
      active = false;
      // Stop the tracks we just acquired in the effect (if any)
      if (newStream) {
        newStream.getTracks().forEach((track) => track.stop());
      }
      // Also stop existing localStream if needed, but newStream covers the race condition
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
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
      ctx.fillStyle = '#202124';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(name, canvas.width / 2, canvas.height / 2);
      requestAnimationFrame(draw);
    };
    draw();
    return canvas.captureStream(30);
  };

  const handleToggleAudio = () => {
    if (localStream) {
      localStream
        .getAudioTracks()
        .forEach((t) => (t.enabled = !isAudioEnabled));
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      localStream
        .getVideoTracks()
        .forEach((t) => (t.enabled = !isVideoEnabled));
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    router.push('/meeting');
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/meeting/${roomId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Deduplicate remote participants and map their streams
  const participantsWithStreams = useMemo(() => {
    // 1. Get all unique remote participants from useSocket
    const streamsList: Array<{ id: string; userId: string; name: string; stream: MediaStream; isVideoEnabled: boolean; isAudioEnabled: boolean; type: 'camera' | 'screen' }> = [];
    const processedUserIds = new Set<string>();

    const localId = socket?.id;

    remoteParticipants.forEach(p => {
      // Find camera video and any audio streams for this participant
      const userVideo = remoteStreams.find(s => s.userId === p.userId && s.kind === 'video' && s.type === 'camera');
      const userAudio = remoteStreams.find(s => s.userId === p.userId && s.kind === 'audio');

      const compositeStream = new MediaStream();
      let isVideoEnabled = false;
      let isAudioEnabled = false;

      if (userVideo) {
        userVideo.stream.getVideoTracks().forEach(t => compositeStream.addTrack(t));
        isVideoEnabled = true;
      }

      if (userAudio) {
        userAudio.stream.getAudioTracks().forEach(t => compositeStream.addTrack(t));
        isAudioEnabled = true;
      }

      const pId = p.userId || p.id || `temp-${Math.random()}`;

      streamsList.push({
        id: `user-${pId}`,
        userId: pId,
        name: p.name || 'Unknown',
        stream: compositeStream,
        isVideoEnabled,
        isAudioEnabled,
        type: 'camera',
      });
      processedUserIds.add(p.userId as string);
    });

    // 2. Add screen shares as SEPARATE tiles
    remoteStreams
      .filter(s => s.type === 'screen' && s.kind === 'video')
      .forEach(s => {
        // Skip if it's our own screen (we see it via localStream logic in VideoGrid if needed, 
        // though usually we just show a "You are presenting" placeholder)
        if (s.userId === localId) return;

        const stream = new MediaStream();
        s.stream.getVideoTracks().forEach(t => stream.addTrack(t));

        streamsList.push({
          id: `screen-${s.id}`, // s.id is already unique (userId-producerId)
          userId: s.userId,
          name: `${s.name} (Screen)`,
          stream,
          isVideoEnabled: true,
          isAudioEnabled: false,
          type: 'screen'
        });
      });

    return streamsList;
  }, [remoteParticipants, remoteStreams, socket?.id]);

  if (!hasMounted || !hasJoined || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#202124]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Entering meeting room...</p>
        </div>
      </div>
    );
  }

  const totalParticipants = 1 + remoteParticipants.length;

  return (
    <div className="h-screen bg-[#202124] flex flex-col relative overflow-hidden">
      {/* Header / Info (Floating Style on the side) */}
      <div className="absolute top-6 left-6 z-40 hidden md:block group">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white font-medium text-sm">
            {meeting?.title || roomId}
          </span>
          <div className="w-[1px] h-3 bg-white/20" />
          <span className="text-gray-300 text-xs">
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Main Video Section */}
      <div className="flex-1 flex min-h-0 relative">
        <div
          className={`flex-1 flex flex-col transition-all duration-500 ${activeSidebar ? 'mr-80 md:mr-96' : ''}`}
        >
          <div className="flex-1 flex items-center justify-center">
            {isMediaReady ? (
              <>
                <VideoGrid
                  streams={participantsWithStreams}
                  localStream={localStream}
                  localName={userName}
                  localVideoEnabled={isVideoEnabled}
                  localAudioEnabled={isAudioEnabled}
                />
                {/* <div className="absolute left-6 bottom-6 z-50 w-[320px] max-w-[90vw] bg-black/70 text-xs text-white rounded-2xl border border-white/10 p-3 backdrop-blur-md shadow-2xl">
                  <div className="font-semibold text-sm text-slate-100 mb-2">
                    Meeting debug
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-slate-300">Socket</div>
                    <div className="text-white truncate">
                      {socket?.id ?? 'waiting...'}
                    </div>
                    <div className="text-slate-300">Connected</div>
                    <div className="text-white">
                      {isConnected ? 'yes' : 'no'}
                    </div>
                    <div className="text-slate-300">Mediasoup ready</div>
                    <div className="text-white">
                      {isMediasoupReady ? 'yes' : 'no'}
                    </div>
                    <div className="text-slate-300">Remote streams</div>
                    <div className="text-white">{remoteStreams.length}</div>
                    <div className="text-slate-300">Local producers</div>
                    <div className="text-white">
                      {mediasoupDebug.localProducerIds.join(', ') || 'none'}
                    </div>
                    <div className="text-slate-300">Remote producers</div>
                    <div className="text-white">
                      {mediasoupDebug.remoteProducerIds.join(', ') || 'none'}
                    </div>
                    <div className="text-slate-300">Pending producers</div>
                    <div className="text-white">
                      {mediasoupDebug.pendingProducerCount}
                    </div>
                  </div>
                </div> */}
              </>
            ) : (
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Participant List */}
        {activeSidebar && (
          <div className="absolute right-0 top-0 bottom-0 w-80 md:w-96 bg-[#202124] shadow-2xl border-l border-white/10 z-50 flex flex-col m-4 rounded-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-medium text-white">
                {activeSidebar === 'participants' ? 'People' : 'Messages'}
              </h3>
              <button
                onClick={() => setActiveSidebar(null)}
                className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSidebar === 'participants' ? (
                <>
                  {/* Local user */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-200">{userName} (You)</span>
                    </div>
                  </div>

                  {/* Remote participants */}
                  {remoteParticipants.map((p, idx) => (
                    <div
                      key={`${p.userId}-${idx}`}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-200">{p.name}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 italic">
                  Chat is coming soon...
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            {activeSidebar === 'participants' && (
              <div className="p-4 bg-white/5 rounded-xl m-4">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Link Copied' : 'Add People'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meeting Controls */}
      <MeetingControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isSharing={isSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onEndCall={handleEndCall}
        onShareScreen={handleToggleScreenShare}
        onToggleParticipants={() =>
          setActiveSidebar(
            activeSidebar === 'participants' ? null : 'participants'
          )
        }
        participantCount={totalParticipants}
      />
    </div>
  );
}
