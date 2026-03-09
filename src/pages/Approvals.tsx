import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorksTable } from '@/components/works/WorksTable';
import type { Work } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { notifyDirectors } from '@/lib/notifications';
import { PageTransition } from '@/components/layout/PageTransition';

export default function Approvals() {
    const [works, setWorks] = useState<Work[]>([]);
    const [loading, setLoading] = useState(true);
    const { role, profile } = useAuth();
    const actorName = profile?.full_name || 'Someone';

    // Allow Directors and ADs only
    const canApprove = role === 'Director' || role === 'Assistant Director';

    useEffect(() => {
        async function fetchApprovals() {
            const { data, error } = await supabase
                .from('works')
                .select('*, division:divisions(*)')
                .eq('pending_r2_approval', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching approvals:', error);
                toast.error('Failed to load pending approvals');
            } else {
                setWorks((data as unknown as Work[]) || []);
            }
            setLoading(false);
        }

        if (canApprove) fetchApprovals();
    }, [canApprove]);

    const handleApprove = async (id: string, ubqn: string) => {
        try {
            const { data, error } = await supabase.from('works').update({
                status: 'Running R2',
                pending_r2_approval: false,
                r2_approval_requested_by: null
            }).eq('id', id).select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Update failed. You may not have permission to modify this record.");

            setWorks(works.filter(w => w.id !== id));
            toast.success(`Work order ${ubqn} approved for Running R2`);
            // Notify all Directors/ADs
            notifyDirectors({
                type: 'r2_approved',
                title: 'R2 Approved',
                message: `${actorName} approved work order ${ubqn} for Running R2`,
                link: `/works/${id}`,
                metadata: { ubqn, actor: actorName },
            });
        } catch (error) {
            console.error('Error approving work:', error);
            toast.error('Could not approve the work order.');
        }
    };

    const handleReject = async (id: string, ubqn: string) => {
        try {
            const { data, error } = await supabase.from('works').update({
                pending_r2_approval: false,
                r2_approval_requested_by: null
            }).eq('id', id).select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Update failed. You may not have permission to modify this record.");

            setWorks(works.filter(w => w.id !== id));
            toast.success(`Work order ${ubqn} request rejected`);
            // Notify all Directors/ADs
            notifyDirectors({
                type: 'r2_rejected',
                title: 'R2 Request Rejected',
                message: `${actorName} rejected R2 request for work order ${ubqn}`,
                link: `/works/${id}`,
                metadata: { ubqn, actor: actorName },
            });
        } catch (error) {
            console.error('Error rejecting work:', error);
            toast.error('Could not reject the work order.');
        }
    };

    if (!canApprove) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-[80vh] gap-6 text-center px-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl animate-pulse" />
                        <div className="relative p-6 bg-destructive/10 rounded-full border border-destructive/20">
                            <ShieldCheck className="h-12 w-12 text-destructive" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
                        <p className="text-muted-foreground max-w-sm text-base leading-relaxed">
                            This area is restricted to administrators and co-ordinators only.
                        </p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <PageTransition>
                <div className="page-shell space-y-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-amber-500/[0.03] p-8 mt-4">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/10 shadow-sm">
                                <ShieldCheck className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground">
                                        Pending Approvals
                                    </h1>
                                    {works.length > 0 && (
                                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                            {works.length} Requests
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-base">
                                    Review and manage "Running R2" status change requests from the team.
                                </p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : works.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-12 text-center bg-card/50">
                            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold text-foreground">No Pending Approvals</h3>
                            <p className="text-muted-foreground mt-1">Check back later for new requests.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                            <WorksTable
                                works={works}
                                onApproveR2={handleApprove}
                                onRejectR2={handleReject}
                            />
                        </div>
                    )}
                </div>
            </PageTransition>
        </AppLayout>
    );
}
