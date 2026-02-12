import { ShieldAlert } from "lucide-react";
import { AppLayout } from "./layout/AppLayout";

export const AccessDenied = () => {
    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-center animate-in fade-in duration-500">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold tracking-tight text-ub-navy">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">
                    You do not have permission to view this area. Please contact your system administrator if you believe this is an error.
                </p>
            </div>
        </AppLayout>
    );
};
