import { Link, useLocation } from 'react-router-dom';
import logo from '/logo.png';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  ShieldCheck,
  LogOut,
  ChevronDown,
  UserCheck,
  FileText,
  MousePointer2,
  Lock,
  Landmark,
  PlusCircle,
  FileCheck2,
  Receipt,
  Mail,
  FileSpreadsheet,
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
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, access: ['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer'] },
  { name: 'Works', href: '/works', icon: Briefcase, access: ['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer'] },
  { name: 'Junior Engineers', href: '/employees', icon: Users, access: ['Director', 'Assistant Director'] },
  { name: 'Financials', href: '/finance', icon: Landmark, access: ['Director', 'Assistant Director', 'Admin'] },
  { name: 'Hierarchy', href: '/hierarchy', icon: Building2, access: ['Director', 'Assistant Director', 'Junior Engineer'] },
  { name: 'Third Party', href: '/third-party', icon: UserCheck, access: ['Director', 'Assistant Director', 'Admin'] },
  { name: 'Peripherals', href: '/peripherals', icon: MousePointer2, access: ['Director', 'Assistant Director', 'Admin'] },
];

const addWorkSubItems = [
  { name: 'Generate Quotation', href: '/quotations', icon: FileText, color: 'text-blue-500' },
  { name: 'Tender', href: '/tender/new', icon: FileCheck2, color: 'text-orange-500' },
  { name: 'HR (Hand Receipt)', href: '/hand-receipt/new', icon: Receipt, color: 'text-violet-500' },
];

const invoiceGenSubItems = [
  { name: 'Forwarding Letter', href: '/forwarding-letter/new', icon: Mail, color: 'text-emerald-500' },
  { name: 'Invoice', href: '/invoice/new', icon: FileSpreadsheet, color: 'text-amber-500' },
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
  const [addWorkOpen, setAddWorkOpen] = useState(false);
  const [invoiceGenOpen, setInvoiceGenOpen] = useState(false);

  const checkAccess = (allowedRoles: string[]) => {
    if (isDirector) return true;
    return role ? allowedRoles.includes(role) : false;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-md ring-1 ring-white/10">
          <img
            src={logo}
            alt="URBANBUILD Logo"
            className="h-full w-full object-contain"
          />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-sidebar-foreground font-heading">
          URBANBUILD<span className="text-sidebar-primary">™</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <div key={item.name}>
              <Link
                to={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-sidebar-primary" />
                )}
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground"
                )} />
                {item.name}
              </Link>

              {/* Add Work Collapsible — rendered right after Works */}
              {item.name === 'Works' && (isDirector || role === 'Admin' || role === 'Co-ordinator') && (
                <Collapsible open={addWorkOpen} onOpenChange={setAddWorkOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200">
                    <span className="flex items-center gap-3">
                      <PlusCircle className="h-5 w-5" />
                      Add Work
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        addWorkOpen && 'rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-6 pt-1">
                    {addWorkSubItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                            isSubActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          )}
                        >
                          <subItem.icon className={cn('h-4 w-4', subItem.color)} />
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Invoice Generation Collapsible — rendered right after Add Work */}
              {item.name === 'Works' && (isDirector || role === 'Admin' || role === 'Co-ordinator') && (
                <Collapsible open={invoiceGenOpen} onOpenChange={setInvoiceGenOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200">
                    <span className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5" />
                      Invoice Generation
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        invoiceGenOpen && 'rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-6 pt-1">
                    {invoiceGenSubItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                            isSubActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          )}
                        >
                          <subItem.icon className={cn('h-4 w-4', subItem.color)} />
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          );
        })}

        {/* Divisions Collapsible */}
        {(isDirector || role === 'Admin' || role === 'Co-ordinator') && (
          <Collapsible open={divisionsOpen} onOpenChange={setDivisionsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200">
              <span className="flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                Quick Access
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  divisionsOpen && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-6 pt-1">
              {divisions.map((division) => (
                <Link
                  key={division.code}
                  to={`/works?division=${division.code}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
                >
                  <div className={cn('h-2 w-2 rounded-full ring-2 ring-current/20', division.color)} />
                  {division.name}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </nav>

      {/* Bottom gradient fade */}
      <div className="pointer-events-none h-8 bg-gradient-to-t from-sidebar to-transparent -mt-8 relative z-10" />

      {/* User & Settings / Approvals */}
      <div className="border-t border-sidebar-border p-3">
        {(isDirector) && (
          <div className="flex items-center gap-1">
            <Link
              to="/approvals"
              className={cn(
                "group relative flex-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                location.pathname === '/approvals'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
              )}
            >
              {location.pathname === '/approvals' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-sidebar-primary" />
              )}
              <ShieldCheck className={cn("h-5 w-5 transition-colors", location.pathname === '/approvals' && "text-sidebar-primary")} />
              Approvals
            </Link>
            <NotificationBell />
          </div>
        )}

        <div className="mt-2 flex items-center justify-between rounded-xl bg-sidebar-accent/30 px-3 py-2.5 backdrop-blur-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold font-heading">
              {profile?.full_name || 'User'}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/50 uppercase tracking-widest font-bold">
              {role || 'Staff'}
            </p>
          </div>
          <button
            onClick={signOut}
            title="Sign Out"
            className="rounded-lg p-2 text-sidebar-foreground/50 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
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
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-sidebar text-sidebar-foreground md:block border-r border-sidebar-border">
      <AppSidebarContent />
    </aside>
  );
}

export { AppSidebarContent };
