import { useState } from 'react';
import { meetingApi } from '@/lib/api/meeting';
import { useRouter } from 'next/navigation';

interface CreateMeetingParams {
    type: 'instant' | 'scheduled';
    scheduledTime?: Date;
    title?: string;
}

export const useCreateMeeting = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const createMeeting = async (params: CreateMeetingParams) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await meetingApi.createMeeting({
                type: params.type,
                scheduledTime: params.scheduledTime?.toISOString(),
                title: params.title,
            });

            // Redirect to meeting room
            router.push(`/meeting/${response.roomId}`);
            return response;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { createMeeting, isLoading, error };
};