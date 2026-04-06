interface CreateMeetingRequest {
    type: 'instant' | 'scheduled';
    scheduledTime?: string; // ISO format
    title?: string;
}

interface MeetingResponse {
    id: string;
    roomId: string;
    title: string;
    hostId: string;
    scheduledTime: string | null;
    isActive: boolean;
    joinUrl: string;
}

export const meetingApi = {
    createMeeting: async (data: CreateMeetingRequest): Promise<MeetingResponse> => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meetings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create meeting');
        }

        return response.json();
    },
};