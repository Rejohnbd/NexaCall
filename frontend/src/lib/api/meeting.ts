interface CreateMeetingRequest {
    type: 'instant' | 'scheduled';
    scheduledTime?: string; // ISO format
    title?: string;
    hostName?: string;
    hostEmail?: string;
}

export interface MeetingResponse {
    id: string;
    roomId: string;
    title: string;
    type: string;
    scheduledTime: string | null;
    isActive: boolean;
    hostName: string;
    joinUrl: string;
    createdAt: string;
}


export const meetingApi = {
    createMeeting: async (data: CreateMeetingRequest): Promise<MeetingResponse> => {
        console.log(data);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meetings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify(data),
        });


        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create meeting');
        }

        const result = await response.json();
        return result.data;
    },

    getMeetingByRoomId: async (roomId: string): Promise<MeetingResponse> => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meetings/room/${roomId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch meeting');
        }

        const result = await response.json();
        return result.data;
    },
};
