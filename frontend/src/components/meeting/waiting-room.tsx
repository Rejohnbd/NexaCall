'use client';

import { useState } from 'react';
import { Video, Mic, VideoOff, MicOff } from 'lucide-react';

interface WaitingRoomProps {
    meetingTitle?: string;
    hostName?: string;
    onJoin: (name: string) => void;
}

export const WaitingRoom = ({ meetingTitle, hostName, onJoin }: WaitingRoomProps) => {
    const [name, setName] = useState('');
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    return (
        <div className="flex items-center justify-center h-screen bg-gray-950">
            <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Video className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-semibold text-white">Join Meeting</h1>
                    {meetingTitle && (
                        <p className="text-gray-400 mt-1">{meetingTitle}</p>
                    )}
                    {hostName && (
                        <p className="text-sm text-gray-500 mt-2">Hosted by {hostName}</p>
                    )}
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                            className={`flex-1 p-3 rounded-lg flex items-center justify-center gap-2 ${isAudioEnabled ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
                                } text-white transition`}
                        >
                            {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                            {isAudioEnabled ? 'Mute' : 'Unmute'}
                        </button>

                        <button
                            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                            className={`flex-1 p-3 rounded-lg flex items-center justify-center gap-2 ${isVideoEnabled ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
                                } text-white transition`}
                        >
                            {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                            {isVideoEnabled ? 'Stop Video' : 'Start Video'}
                        </button>
                    </div>

                    <button
                        onClick={() => onJoin(name || 'Guest')}
                        disabled={!name.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
                    >
                        Join Meeting
                    </button>
                </div>
            </div>
        </div>
    );
};