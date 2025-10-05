'use client';

import { useEffect } from 'react';
import TagManager from 'react-gtm-module';

interface GoogleTagManagerProps {
    gtmId: string;
}

export const GoogleTagManager = ({ gtmId }: GoogleTagManagerProps) => {
    useEffect(() => {
        if (gtmId) {
            TagManager.initialize({
                gtmId: gtmId,
            });
        }
    }, [gtmId]);

    return null; // This component doesn't render anything
};

// Export individual functions for tracking events if needed
export const trackEvent = (event: any) => {
    TagManager.dataLayer({
        dataLayer: event,
    });
};

export default GoogleTagManager;