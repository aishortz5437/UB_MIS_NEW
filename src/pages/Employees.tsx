import { AppLayout } from '@/components/layout/AppLayout';
import { UserManagement } from '@/components/settings/UserManagement';

export default function Employees() {
  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-muted-foreground">Manage team members</p>
          </div>
        </div>
        <UserManagement />
      </div>
    </AppLayout>
  );
}
