import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  connectionChangedAt: Date | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    connectionChangedAt: null,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({
        isOnline: true,
        wasOffline: !prev.isOnline || prev.wasOffline,
        connectionChangedAt: new Date(),
      }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        isOnline: false,
        wasOffline: true,
        connectionChangedAt: new Date(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
