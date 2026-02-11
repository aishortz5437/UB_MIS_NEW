import { Link, useLocation } from 'react-router-dom';
import logo from '/logo.png';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  LogOut,
  ChevronDown,
  UserCheck,
  FileText,
  MousePointer2,
  Lock, // Added for the locked indicator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

// Define access rules for each navigation item
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, access: ['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Employee'] },
  { name: 'Works', href: '/works', icon: Briefcase, access: ['Director', 'Assistant Director', 'Admin', 'Co-ordinator'] },
  { name: 'Employees', href: '/employees', icon: Users, access: ['Director', 'Assistant Director'] },
  { name: 'Quotations', href: '/quotations', icon: FileText, access: ['Director', 'Assistant Director', 'Admin'] },
  { name: 'Hierarchy', href: '/hierarchy', icon: Building2, access: ['Director', 'Assistant Director'] },
  { name: 'Third Party', href: '/third-party', icon: UserCheck, access: ['Director', 'Assistant Director', 'Admin'] },
  { name: 'Peripherals', href: '/peripherals', icon: MousePointer2, access: ['Director', 'Assistant Director', 'Admin'] },
];

const divisions = [
  { name: 'Roads & Bridges', code: 'RnB', color: 'bg-ub-rnb' },
  { name: 'Buildings & Town Planning', code: 'BTP', color: 'bg-ub-btp' },
  { name: 'Environment & Sustainability', code: 'EnS', color: 'bg-ub-ens' },
];

function AppSidebarContent() {
  const location = useLocation();
  const { profile, signOut, role, isDirector } = useAuth();
  const [divisionsOpen, setDivisionsOpen] = useState(false);

  // Check if a user has access to a specific nav item
  const checkAccess = (allowedRoles: string[]) => {
    if (isDirector) return true;
    return role ? allowedRoles.includes(role) : false;
  };

  return (
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
            <img 
              src={logo} 
              alt="URBANBUILD Logo" 
              className="h-full w-full object-contain" 
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            URBANBUILD<span>™</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const hasAccess = checkAccess(item.access);

            if (!hasAccess) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/30 cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 opacity-50" />
                    {item.name}
                  </div>
                  <Lock className="h-3.5 w-3.5 opacity-40 group-hover:text-red-400 transition-colors" />
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Divisions Collapsible - Only visible/accessible to Operational Roles */}
          {(isDirector || role === 'Admin' || role === 'Co-ordinator') && (
            <Collapsible open={divisionsOpen} onOpenChange={setDivisionsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                <span className="flex items-center gap-3">
                  <Building2 className="h-5 w-5" />
                  Quick Access
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    divisionsOpen && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-6 pt-1">
                {divisions.map((division) => (
                  <Link
                    key={division.code}
                    to={`/works?division=${division.code}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  >
                    <div className={cn('h-2 w-2 rounded-full', division.color)} />
                    {division.name}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </nav>

        {/* User & Settings */}
        <div className="border-t border-sidebar-border p-3">
          {/* Settings Restricted to Admin and Directors */}
          {(isDirector || role === 'Admin') ? (
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === '/settings' 
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
              )}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-sidebar-foreground/30 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 opacity-50" />
                Settings
              </div>
              <Lock className="h-3.5 w-3.5 opacity-40" />
            </div>
          )}
          
          <div className="mt-2 flex items-center justify-between rounded-lg bg-sidebar-accent/30 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {profile?.full_name || 'User'}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60 uppercase tracking-wider">
                {role || 'Staff'}
              </p>
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-sidebar text-sidebar-foreground md:block">
      <AppSidebarContent />
    </aside>
  );
}

export { AppSidebarContent };
