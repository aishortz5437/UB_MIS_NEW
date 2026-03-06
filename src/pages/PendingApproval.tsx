import { motion } from 'framer-motion';
import { Clock, Shield, LogOut, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function PendingApproval() {
    const { user, profile, signOut } = useAuth();

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'there';
    const displayEmail = profile?.email || user?.email || '';

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(222 47% 16%) 40%, hsl(222 35% 20%) 70%, hsl(230 40% 14%) 100%)',
                }}
            />

            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            {/* Glowing orbs */}
            <div
                className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
                style={{
                    background: 'radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)',
                    animation: 'pending-float 8s ease-in-out infinite',
                }}
            />
            <div
                className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
                style={{
                    background: 'radial-gradient(circle, hsl(199 89% 48%) 0%, transparent 70%)',
                    animation: 'pending-float 10s ease-in-out infinite reverse',
                }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
                    className="mb-8"
                >
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2.5 shadow-2xl mx-auto">
                        <img src="/logo.png" alt="UrbanBuild Logo" className="h-full w-full object-contain" />
                    </div>
                </motion.div>

                {/* Brand */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm font-bold uppercase tracking-[0.25em] mb-6"
                    style={{ color: 'hsl(38 92% 60%)' }}
                >
                    UrbanBuild™
                </motion.p>

                {/* Animated Clock Icon */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
                    className="relative mb-8"
                >
                    {/* Pulse ring */}
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'hsl(38 92% 50% / 0.15)' }}
                        animate={{
                            scale: [1, 1.8, 1],
                            opacity: [0.4, 0, 0.4],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: 'easeOut',
                        }}
                    />
                    <div
                        className="relative flex h-20 w-20 items-center justify-center rounded-full"
                        style={{
                            background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.2), hsl(38 92% 50% / 0.05))',
                            border: '1px solid hsl(38 92% 50% / 0.25)',
                        }}
                    >
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                        >
                            <Clock className="h-9 w-9" style={{ color: 'hsl(38 92% 60%)' }} />
                        </motion.div>
                    </div>
                </motion.div>

                {/* Greeting */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3"
                >
                    Hi, {displayName}!
                </motion.h1>

                {/* Main message */}
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl sm:text-2xl font-semibold mb-4"
                    style={{ color: 'hsl(38 92% 65%)' }}
                >
                    Approval Pending
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="text-base leading-relaxed mb-8"
                    style={{ color: 'hsl(215 20% 70%)' }}
                >
                    Your account has been created successfully. An administrator needs to assign your role and permissions before you can access the dashboard. Please wait for approval.
                </motion.p>

                {/* Info cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                    className="w-full space-y-3 mb-10"
                >
                    {/* Account info card */}
                    <div
                        className="flex items-center gap-4 p-4 rounded-xl text-left"
                        style={{
                            background: 'hsl(222 47% 15% / 0.6)',
                            border: '1px solid hsl(222 35% 25% / 0.5)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                            style={{
                                background: 'hsl(199 89% 48% / 0.12)',
                                border: '1px solid hsl(199 89% 48% / 0.15)',
                            }}
                        >
                            <Mail className="h-5 w-5" style={{ color: 'hsl(199 89% 60%)' }} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium" style={{ color: 'hsl(215 20% 55%)' }}>
                                Signed in as
                            </p>
                            <p className="text-sm font-semibold text-white truncate">{displayEmail}</p>
                        </div>
                    </div>

                    {/* Status card */}
                    <div
                        className="flex items-center gap-4 p-4 rounded-xl text-left"
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
                            <Shield className="h-5 w-5" style={{ color: 'hsl(38 92% 60%)' }} />
                        </div>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'hsl(215 20% 55%)' }}>
                                Account Status
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <motion.span
                                    className="h-2 w-2 rounded-full"
                                    style={{ background: 'hsl(38 92% 55%)' }}
                                    animate={{
                                        opacity: [1, 0.4, 1],
                                        scale: [1, 0.85, 1],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <span className="text-sm font-semibold" style={{ color: 'hsl(38 92% 65%)' }}>
                                    Awaiting Role Assignment
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="flex flex-col sm:flex-row items-center gap-3 w-full"
                >
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto h-11 px-6 rounded-xl font-medium text-sm border-white/10 text-white/70 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all"
                        onClick={() => window.location.reload()}
                    >
                        Check Again
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full sm:w-auto h-11 px-6 rounded-xl font-medium text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        onClick={signOut}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-12 text-xs"
                    style={{ color: 'hsl(215 20% 40%)' }}
                >
                    © {new Date().getFullYear()} UrbanBuild™ • Management Information System
                </motion.p>
            </div>

            {/* Animations */}
            <style>{`
        @keyframes pending-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
        </div>
    );
}
