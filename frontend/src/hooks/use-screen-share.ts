import { useState, useCallback } from 'react';

export const useScreenShare = () => {
    const [isSharing, setIsSharing] = useState(false);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            setScreenStream(stream);
            setIsSharing(true);

            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

            return stream;
        } catch (error) {
            console.error('Screen share failed:', error);
            return null;
        }
    }, []);

    const stopScreenShare = useCallback(() => {
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            setScreenStream(null);
            setIsSharing(false);
        }
    }, [screenStream]);

    return { isSharing, screenStream, startScreenShare, stopScreenShare };
};