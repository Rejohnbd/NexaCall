// frontend/src/hooks/use-fullscreen.ts
import { useCallback, useState, useEffect } from 'react';

export const useFullscreen = () => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Check fullscreen status on change
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    // Toggle fullscreen for a specific element
    const toggleFullscreen = useCallback((element: HTMLElement | null) => {
        if (!element) return;

        if (!document.fullscreenElement) {
            // Enter fullscreen
            const requestMethod = element.requestFullscreen ||
                (element as any).webkitRequestFullscreen ||
                (element as any).mozRequestFullScreen ||
                (element as any).msRequestFullscreen;

            if (requestMethod) {
                requestMethod.call(element).catch((err: Error) => {
                    console.error('Error entering fullscreen:', err);
                });
            }
        } else {
            // Exit fullscreen
            const exitMethod = document.exitFullscreen ||
                (document as any).webkitExitFullscreen ||
                (document as any).mozCancelFullScreen ||
                (document as any).msExitFullscreen;

            if (exitMethod) {
                exitMethod.call(document).catch((err: Error) => {
                    console.error('Error exiting fullscreen:', err);
                });
            }
        }
    }, []);

    return { isFullscreen, toggleFullscreen };
};