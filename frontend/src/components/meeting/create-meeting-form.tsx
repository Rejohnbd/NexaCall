'use client';

import { useState } from 'react';
import { useCreateMeeting } from '@/hooks/use-create-meeting';
import { CalendarIcon, ClockIcon, VideoIcon } from 'lucide-react';


interface CreateMeetingFormProps {
    onClose: () => void;
    onSuccess?: (meetingId: string, roomId: string) => void;
}

export const CreateMeetingForm = ({ onClose, onSuccess }: CreateMeetingFormProps) => {
    const [meetingType, setMeetingType] = useState<'instant' | 'scheduled'>('instant');
    const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [scheduledTime, setScheduledTime] = useState<string>('10:00');
    const [title, setTitle] = useState('');
    const { createMeeting, isLoading } = useCreateMeeting();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let scheduledDateTime: Date | undefined;
        if (meetingType === 'scheduled') {
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            scheduledDateTime = new Date(scheduledDate);
            scheduledDateTime.setHours(hours, minutes);
        }

        const meeting = await createMeeting({
            type: meetingType,
            scheduledTime: scheduledDateTime,
            title: title || undefined,
        });

        onSuccess?.(meeting.id, meeting.roomId);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Title (Optional)
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Daily Standup, Client Meeting"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Meeting Type Radio */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Type
                </label>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            name="meetingType"
                            value="instant"
                            checked={meetingType === 'instant'}
                            onChange={() => setMeetingType('instant')}
                            className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <VideoIcon className="w-4 h-4 text-green-600" />
                                <span className="font-medium">Instant Meeting</span>
                            </div>
                            <p className="text-sm text-gray-500">Start a meeting right now</p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            name="meetingType"
                            value="scheduled"
                            checked={meetingType === 'scheduled'}
                            onChange={() => setMeetingType('scheduled')}
                            className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">Schedule Meeting</span>
                            </div>
                            <p className="text-sm text-gray-500">Plan a meeting for later</p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Schedule Date & Time (shown only when scheduled is selected) */}
            {meetingType === 'scheduled' && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Date
                        </label>
                        <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Time
                        </label>
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Preview scheduled datetime */}
                    <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                        Scheduled for: {scheduledTime}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <VideoIcon className="w-4 h-4" />
                            {meetingType === 'instant' ? 'Start Meeting' : 'Schedule Meeting'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};