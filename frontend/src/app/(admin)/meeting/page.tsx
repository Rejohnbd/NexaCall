'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { CreateMeetingDialog } from '@/components/meeting/create-meeting-dialog';
import { useRouter } from 'next/navigation';

export default function MeetingPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();

    const handleMeetingCreated = (meetingId: string, roomId: string) => {
        router.push(`/meeting/${roomId}`);
    };

    return (
        <>
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="px-4 lg:px-6 flex justify-between items-center">
                            <h1 className="text-2xl font-semibold">Meeting</h1>
                            <button
                                onClick={() => setIsDialogOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create Meeting
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <CreateMeetingDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={handleMeetingCreated}
            />
        </>
    );
}