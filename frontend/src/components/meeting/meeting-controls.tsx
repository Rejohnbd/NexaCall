'use client';

import {
    Mic,
    MicOff,
    Video as VideoIcon,
    VideoOff,
    PhoneOff,
    ScreenShare,
    StopCircle,
    Users,
    Settings,
    MoreVertical,
    MessageSquare,
    Info
} from 'lucide-react';

interface MeetingControlsProps {
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isSharing: boolean;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onEndCall: () => void;
    onShareScreen: () => void;
    onToggleParticipants: () => void;
    participantCount: number;
}

export const MeetingControls = ({
    isAudioEnabled,
    isVideoEnabled,
    isSharing,
    onToggleAudio,
    onToggleVideo,
    onEndCall,
    onShareScreen,
    onToggleParticipants,
    participantCount
}: MeetingControlsProps) => {
    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 px-4">
            <div className="max-w-screen-xl mx-auto flex items-center justify-between">
                {/* Left Side: Meeting Info (Visible on larger screens) */}
                <div className="hidden md:flex items-center gap-4 text-white">
                    <span className="font-medium text-sm">Meeting Room</span>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Info className="w-5 h-5 text-gray-300" />
                    </button>
                </div>

                {/* Center: Main Controls */}
                <div className="flex items-center gap-3 bg-[#202124] p-3 rounded-2xl shadow-2xl ring-1 ring-white/10 mx-auto md:mx-0">
                    <button
                        onClick={onToggleAudio}
                        className={`p-3 rounded-full transition-all duration-300 ${isAudioEnabled
                                ? 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg ring-2 ring-red-500/50'
                            }`}
                        title={isAudioEnabled ? 'Mute' : 'Unmute'}
                    >
                        {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                    </button>

                    <button
                        onClick={onToggleVideo}
                        className={`p-3 rounded-full transition-all duration-300 ${isVideoEnabled
                                ? 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg ring-2 ring-red-500/50'
                            }`}
                        title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
                    >
                        {isVideoEnabled ? <VideoIcon className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                    </button>

                    <button
                        onClick={onShareScreen}
                        className={`p-3 rounded-full transition-all duration-300 ${isSharing
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg ring-2 ring-blue-500/50 font-bold'
                                : 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
                            }`}
                        title={isSharing ? 'Stop Presenting' : 'Present Now'}
                    >
                        {isSharing ? <StopCircle className="w-6 h-6" /> : <ScreenShare className="w-6 h-6" />}
                    </button>

                    <button
                        className="p-3 bg-[#3c4043] hover:bg-[#4a4d51] text-white rounded-full transition-all transition-colors hidden sm:block"
                        title="Settings"
                    >
                        <Settings className="w-6 h-6" />
                    </button>

                    <button
                        onClick={onEndCall}
                        className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all duration-300 shadow-xl hover:scale-110 active:scale-95"
                        title="End Call"
                    >
                        <PhoneOff className="w-7 h-7" />
                    </button>
                </div>

                {/* Right Side: Participant & Chat Controls */}
                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={onToggleParticipants}
                        className="p-3 hover:bg-white/10 rounded-full transition-all relative text-gray-300 hover:text-white"
                        title="Participants"
                    >
                        <Users className="w-6 h-6" />
                        {participantCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#1a1c1e] text-white min-w-[20px] text-center">
                                {participantCount}
                            </span>
                        )}
                    </button>

                    <button className="p-3 hover:bg-white/10 rounded-full transition-all text-gray-300 hover:text-white" title="Chat">
                        <MessageSquare className="w-6 h-6" />
                    </button>

                    <button className="p-3 hover:bg-white/10 rounded-full transition-all text-gray-300 hover:text-white" title="Menu">
                        <MoreVertical className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};