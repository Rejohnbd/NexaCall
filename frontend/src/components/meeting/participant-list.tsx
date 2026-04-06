'use client';

import { Users, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface Participant {
    id: string;
    name: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isHost: boolean;
}

interface ParticipantListProps {
    participants: Participant[];
    currentUserId?: string;
}

export const ParticipantList = ({ participants, currentUserId }: ParticipantListProps) => {
    return (
        <div className="w-80 bg-gray-900 rounded-xl p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-700">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="font-medium text-white">
                    Participants ({participants.length})
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
                {participants.map((participant) => (
                    <div
                        key={participant.id}
                        className="flex items-center justify-between p-2 bg-gray-800 rounded-lg"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">
                                    {participant.name}
                                    {participant.isHost && (
                                        <span className="ml-2 text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded">
                                            Host
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {participant.isAudioEnabled ? (
                                <Mic className="w-3 h-3 text-green-400" />
                            ) : (
                                <MicOff className="w-3 h-3 text-red-400" />
                            )}
                            {participant.isVideoEnabled ? (
                                <Video className="w-3 h-3 text-green-400" />
                            ) : (
                                <VideoOff className="w-3 h-3 text-red-400" />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};