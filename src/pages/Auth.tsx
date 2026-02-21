import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Shield, BarChart3, FolderKanban, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Google Login Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast({ title: 'Invalid email or password', variant: 'destructive' });
          } else {
            toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
          }
        } else {
          navigate('/');
        }
      } else {
        if (password.length < 6) {
          toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({ title: 'Email already registered', description: 'Please sign in instead', variant: 'destructive' });
          } else {
            toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'Account created', description: 'You can now sign in' });
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: FolderKanban,
      title: 'Project Tracking',
      description: 'Monitor all running works across sectors in real-time',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Comprehensive insights and progress reports at a glance',
    },
    {
      icon: Shield,
      title: 'Secure Access',
      description: 'Role-based permissions with enterprise-grade security',
    },
  ];

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* ── Left Panel - Immersive Branding ── */}
      <div className="hidden w-[55%] lg:flex lg:flex-col lg:justify-between relative overflow-hidden">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, hsl(222 47% 12%) 0%, hsl(222 47% 18%) 40%, hsl(222 35% 22%) 70%, hsl(230 40% 15%) 100%)',
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Glowing orbs for depth */}
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

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg">
              <img src="/logo.png" alt="UrbanBuild Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">URBANBUILD™</span>
          </div>

          {/* Hero text */}
          <div className="space-y-8 max-w-lg">
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
                Internal Dashboard
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-[1.15] text-white tracking-tight">
                Manage Projects
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, hsl(38 92% 55%) 0%, hsl(38 92% 70%) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Across Sectors
                </span>
              </h1>
              <p className="text-base xl:text-lg leading-relaxed" style={{ color: 'hsl(215 20% 70%)' }}>
                A centralized platform for tracking, managing, and reporting on all active projects with real-time updates.
              </p>
            </div>

            {/* Feature pills */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:translate-x-1"
                  style={{
                    background: 'hsl(222 47% 15% / 0.6)',
                    border: '1px solid hsl(222 35% 25% / 0.5)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'hsl(38 92% 50% / 0.12)',
                      border: '1px solid hsl(38 92% 50% / 0.15)',
                    }}
                  >
                    <feature.icon className="h-5 w-5" style={{ color: 'hsl(38 92% 60%)' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'hsl(215 20% 60%)' }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
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

      {/* ── Right Panel - Auth Form ── */}
      <div className="flex w-full items-center justify-center bg-background lg:w-[45%] relative">
        {/* Subtle background pattern for right side */}
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

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-2 text-muted-foreground text-sm sm:text-base">
              {isLogin
                ? 'Enter your credentials to access the dashboard'
                : 'Fill in your details to get started'}
            </p>
          </div>

          {/* Google Login Button (Top position for prominence) */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-sm font-medium rounded-xl border-2 hover:border-foreground/20 hover:bg-muted/50 transition-all duration-200 mb-6"
            onClick={handleGoogleLogin}
          >
            <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium tracking-wider">
                or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field - Sign Up only */}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: isLogin ? '0px' : '100px',
                opacity: isLogin ? 0 : 1,
                marginBottom: isLogin ? '-8px' : undefined,
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Full Name
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-10 h-12 rounded-xl bg-muted/30 border-border/60 focus:bg-background transition-colors"
                    required={!isLogin}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="pl-10 h-12 rounded-xl bg-muted/30 border-border/60 focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-11 h-12 rounded-xl bg-muted/30 border-border/60 focus:bg-background transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold text-sm mt-2 transition-all duration-200 shadow-lg hover:shadow-xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(222 47% 18%) 0%, hsl(222 47% 24%) 100%)',
              }}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Please wait...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? 'Sign in' : 'Create account'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="font-semibold text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors">
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>

          {/* Security note */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
            <Lock className="h-3 w-3" />
            <span>Your data is encrypted and secure</span>
          </div>
        </div>
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}