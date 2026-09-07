import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile } from '@/types/database';

const AUTH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, label: string, ms = AUTH_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }) as Promise<T>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  permissions: string[];
  isDirector: boolean; // Helper to check for Director/Asst Director quickly
  hasPermission: (permission: string) => boolean;
  loading: boolean; // Only tracks auth session bootstrap
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>; // Useful if roles are updated manually
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Helper: Derived state for Director-level access
  const isDirector = role === 'Director' || role === 'Assistant Director';

  // Helper: Check if user has a specific permission or is a Director
  const hasPermission = (permission: string) => {
    if (isDirector) return true;
    return permissions.includes(permission);
  };

  const fetchUserData = async (userId: string) => {
    try {
      // maybeSingle() is safer than .single() because it doesn't throw 
      // an error if the user doesn't have a role yet.
      const [profileRes, roleRes, permRes] = await withTimeout(
        Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
          supabase.from('user_permissions').select('permission_name').eq('user_id', userId)
        ]),
        'fetchUserData'
      );

      // Set profile if found, otherwise keep as null
      if (!profileRes.error) {
        setProfile((profileRes.data as Profile) || null);
      }

      // Set role if found. If the role query errors, keep existing role.
      if (roleRes.error) {
      } else if (roleRes.data && roleRes.data.role) {
        let fetchedRole = roleRes.data.role as string;
        // Map 'Employee' (legacy) or 'Junior Engineer' (new) both to 'Junior Engineer' for the UI
        if (fetchedRole === 'Employee') fetchedRole = 'Junior Engineer';

        setRole(fetchedRole as AppRole);
      } else {
        setRole('Pending' as AppRole);
      }

      // Set permissions
      if (!permRes.error && permRes.data) {
        setPermissions(permRes.data.map(p => (p as any).permission_name));
      } else {
        setPermissions([]);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      // On error, keep the previous role to avoid downgrading due to transient issues.
    } finally {
      // Profile/role loading is intentionally decoupled from auth bootstrap.
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check active sessions and sets the user
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          'getSession'
        );
        if (!isMounted) return;
        if (error) throw error;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Await profile/role fetch so the UI renders with correct permissions.
          await fetchUserData(session.user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error getting session:', error);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password');
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  const refreshRole = async () => {
    if (user) await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      permissions,
      isDirector,
      hasPermission,
      loading,
      signIn,
      signUp,
      signOut,
      refreshRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
