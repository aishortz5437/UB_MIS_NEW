import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserFriendlyErrorMessage } from '@/lib/error-mapping';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Supabase automatically picks up the recovery token from the URL hash
  // and establishes a session via onAuthStateChange with event 'PASSWORD_RECOVERY'.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (user clicked link, page loaded)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast({ title: 'Password updated successfully!' });

      // Redirect to dashboard after a short delay
      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* ── Left Panel - Branding ── */}
      <div className="hidden w-[55%] lg:flex lg:flex-col lg:justify-between relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, hsl(222 47% 12%) 0%, hsl(222 47% 18%) 40%, hsl(222 35% 22%) 70%, hsl(230 40% 15%) 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{
            background: 'radial-gradient(circle, hsl(199 89% 48%) 0%, transparent 70%)',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg">
              <img src="/logo.png" alt="UrbanBuild Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">URBANBUILD™</span>
          </div>

          <div className="space-y-6 max-w-lg">
            <div className="space-y-4">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase"
                style={{
                  background: 'hsl(38 92% 50% / 0.15)',
                  color: 'hsl(38 92% 65%)',
                  border: '1px solid hsl(38 92% 50% / 0.2)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-ub-amber animate-pulse" />
                Account Recovery
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-[1.15] text-white tracking-tight">
                Reset Your
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, hsl(38 92% 55%) 0%, hsl(38 92% 70%) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Password
                </span>
              </h1>
              <p className="text-base xl:text-lg leading-relaxed" style={{ color: 'hsl(215 20% 70%)' }}>
                Choose a strong new password to secure your account. Your password must be at least 6 characters long.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>
              © {new Date().getFullYear()} UrbanBuild™. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'hsl(215 20% 45%)' }}>
              <Shield className="h-3.5 w-3.5" />
              <span>Secured by Supabase</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel - Reset Form ── */}
      <div className="flex w-full items-center justify-center bg-background lg:w-[45%] relative">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 w-full max-w-[420px] px-6 sm:px-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-md border border-border/40">
              <img src="/logo.png" alt="UrbanBuild Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight">UrbanBuild™</span>
          </div>

          {success ? (
            /* ── Success State ── */
            <div className="text-center space-y-6">
              <div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: 'hsl(142 76% 36% / 0.1)',
                  border: '2px solid hsl(142 76% 36% / 0.2)',
                }}
              >
                <CheckCircle2 className="h-10 w-10" style={{ color: 'hsl(142 76% 36%)' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Password Updated!</h2>
                <p className="mt-2 text-muted-foreground text-sm">
                  Your password has been changed successfully. Redirecting you to the dashboard...
                </p>
              </div>
            </div>
          ) : (
            /* ── Reset Form ── */
            <>
              <div className="text-center lg:text-left mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Set new password</h2>
                <p className="mt-2 text-muted-foreground text-sm sm:text-base">
                  {sessionReady
                    ? 'Enter your new password below'
                    : 'Verifying your reset link...'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">
                    New Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pl-10 pr-11 h-12 rounded-xl bg-muted/30 border-border/60 focus:bg-background transition-colors"
                      required
                      minLength={6}
                      disabled={!sessionReady}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pl-10 pr-11 h-12 rounded-xl bg-muted/30 border-border/60 focus:bg-background transition-colors"
                      required
                      minLength={6}
                      disabled={!sessionReady}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Mismatch hint */}
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-semibold text-sm mt-2 transition-all duration-200 shadow-lg hover:shadow-xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, hsl(222 47% 18%) 0%, hsl(222 47% 24%) 100%)',
                  }}
                  disabled={loading || !sessionReady}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      Update Password
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Back to login */}
              <div className="text-center mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to{' '}
                  <span className="font-semibold text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors">
                    Sign in
                  </span>
                </button>
              </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
            <Lock className="h-3 w-3" />
            <span>Your data is encrypted and secure</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
