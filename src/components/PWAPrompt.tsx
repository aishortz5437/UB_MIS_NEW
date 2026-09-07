import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { X, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PWAPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Optional: console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  // Install Prompt State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);
  const [isIOSPromptVisible, setIsIOSPromptVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Detect if already installed (standalone mode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsAppInstalled(isStandalone);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallAvailable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallAvailable(false);
      setDeferredPrompt(null);
      setIsAppInstalled(true);
      setIsIOSPromptVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios/.test(userAgent);
    
    if (isIOS && isSafari && !isStandalone) {
      // Check if we should show it (maybe they dismissed it previously)
      const dismissed = localStorage.getItem('ios-pwa-dismissed');
      if (!dismissed) {
        setIsIOSPromptVisible(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallAvailable(false);
    }
    setDeferredPrompt(null);
  };

  const closeUpdate = () => {
    setNeedRefresh(false);
  };

  const closeIOSPrompt = () => {
    localStorage.setItem('ios-pwa-dismissed', 'true');
    setIsIOSPromptVisible(false);
  };

  // Do not render anything if no banners are needed
  if (!needRefresh && !isInstallAvailable && !isIOSPromptVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[110] flex flex-col gap-3">
      
      {/* 1. Update Notification */}
      {needRefresh && (
        <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-lg border border-primary/20 animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <div>
                <h4 className="font-bold text-sm">New version available</h4>
                <p className="text-xs opacity-90 mt-0.5">Update now to get the latest features.</p>
              </div>
            </div>
            <button onClick={closeUpdate} className="shrink-0 p-1 rounded-full hover:bg-black/10">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button 
              size="sm" 
              variant="secondary" 
              className="flex-1 font-bold"
              onClick={() => updateServiceWorker(true)}
            >
              Update Now
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="flex-1 hover:bg-black/10 hover:text-white"
              onClick={closeUpdate}
            >
              Later
            </Button>
          </div>
        </div>
      )}

      {/* 2. Android / Desktop Install Prompt */}
      {isInstallAvailable && !needRefresh && (
        <div className="bg-background text-foreground p-4 rounded-xl shadow-xl border border-border animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Download className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Install UrbanBuild</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access.</p>
              </div>
            </div>
            <button onClick={() => setIsInstallAvailable(false)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button 
            size="sm" 
            className="w-full mt-4 font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            onClick={handleInstallClick}
          >
            Install App
          </Button>
        </div>
      )}

      {/* 3. iOS Install Helper */}
      {isIOSPromptVisible && !needRefresh && !isInstallAvailable && (
        <div className="bg-background text-foreground p-4 rounded-xl shadow-xl border border-border animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm">Install UrbanBuild</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tap the <span className="font-bold text-blue-500">Share</span> icon at the bottom of Safari, then select <span className="font-bold">Add to Home Screen</span>.
              </p>
            </div>
            <button onClick={closeIOSPrompt} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
