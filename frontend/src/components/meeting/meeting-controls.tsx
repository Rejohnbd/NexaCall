'use client';

import { Mic, MicOff, Video, VideoOff, PhoneOff, Share2, Users } from 'lucide-react';

interface MeetingControlsProps {
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onEndCall: () => void;
    onShareScreen?: () => void;
    onToggleParticipants?: () => void;
    participantCount?: number;
}

export const MeetingControls = ({
    isAudioEnabled,
    isVideoEnabled,
    onToggleAudio,
    onToggleVideo,
    onEndCall,
    onShareScreen,
    onToggleParticipants,
    participantCount = 0,
}: MeetingControlsProps) => {
    return (
        <div className="flex items-center justify-center gap-4 p-4 bg-gray-900 rounded-xl">
            <button
                onClick={onToggleAudio}
                className={`p-3 rounded-full transition ${isAudioEnabled
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
            >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
                onClick={onToggleVideo}
                className={`p-3 rounded-full transition ${isVideoEnabled
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
            >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {onShareScreen && (
                <button
                    onClick={onShareScreen}
                    className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition"
                >
                    <Share2 className="w-5 h-5" />
                </button>
            )}

            {onToggleParticipants && (
                <button
                    onClick={onToggleParticipants}
                    className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition relative"
                >
                    <Users className="w-5 h-5" />
                    {participantCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full text-xs flex items-center justify-center">
                            {participantCount}
                        </span>
                    )}
                </button>
            )}

            <button
                onClick={onEndCall}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition"
            >
                <PhoneOff className="w-5 h-5" />
            </button>
        </div>
    );
};