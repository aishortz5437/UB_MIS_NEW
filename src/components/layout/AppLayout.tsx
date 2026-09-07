import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AppSidebar, AppSidebarContent } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 flex h-14 w-full items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-64 p-0 bg-sidebar text-sidebar-foreground">
            <AppSidebarContent />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold tracking-tight">URBANBUILD™</span>
      </div>
      <AppSidebar />
      <main className="pl-0 md:pl-64 pt-0 w-full flex-1 flex flex-col min-w-0">
        <div className="min-h-screen w-full flex flex-col flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
