import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AccessDenied } from "@/components/AccessDenied";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // 1. SHOW LOADING SCREEN
  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
          Verifying Access...
        </p>
      </div>
    );
  }

  // 2. CHECK LOGIN STATUS
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 3. CHECK ROLE PERMISSION (RBAC)
  if (requiredRole && role && !requiredRole.includes(role)) {
    return <AccessDenied />;
  }

  // 4. ACCESS GRANTED
  // If all checks pass, render the actual page (the "children").
  return <>{children}</>;
};