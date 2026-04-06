'use client';

import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';
import { CreateMeetingForm } from './create-meeting-form';

interface CreateMeetingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (meetingId: string, roomId: string) => void;
}

export const CreateMeetingDialog = ({ isOpen, onClose, onSuccess }: CreateMeetingDialogProps) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isMounted || !isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50">
                <div className="bg-white rounded-xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-xl font-semibold">Create New Meeting</h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-lg transition"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        <CreateMeetingForm onClose={onClose} onSuccess={onSuccess} />
                    </div>
                </div>
            </div>
        </>
    );
};