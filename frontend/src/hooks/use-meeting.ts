import { useState, useEffect } from 'react';
import { meetingApi, MeetingResponse } from '@/lib/api/meeting';

export const useMeeting = (roomId: string) => {
    const [meeting, setMeeting] = useState<MeetingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMeeting = async () => {
            if (!roomId) return;

            setIsLoading(true);
            try {
                const data = await meetingApi.getMeetingByRoomId(roomId);
                console.log(data, '===================>')
                setMeeting(data);
                setError(null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMeeting();
    }, [roomId]);

    return { meeting, isLoading, error };
};