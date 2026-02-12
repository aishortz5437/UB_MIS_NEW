import { UserManagement } from "@/components/settings/UserManagement";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Settings() {
  const { role } = useAuth();

  // Double-check security: If a non-Director somehow gets here, show Access Denied
  if (role !== 'Director') {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold tracking-tight text-ub-navy">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            This area is restricted to Directors only. Please contact your system administrator if you believe this is an error.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell space-y-8 animate-in fade-in duration-500">
        <div className="page-header border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-ub-navy">
              System Settings
            </h1>
            <p className="text-muted-foreground">
              Manage user access, roles, and system-wide configurations.
            </p>
          </div>
        </div>

        {/* This renders the table we built earlier */}
        <UserManagement />
      </div>
    </AppLayout>
  );
}