import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import type { Notification } from '@/types/database';

function groupByDate(notifications: Notification[]) {
    const groups: { label: string; items: Notification[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayItems: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const earlierItems: Notification[] = [];

    for (const n of notifications) {
        const d = new Date(n.created_at);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime()) todayItems.push(n);
        else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
        else earlierItems.push(n);
    }

    if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
    if (earlierItems.length > 0) groups.push({ label: 'Earlier', items: earlierItems });

    return groups;
}

export default function NotificationsPage() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
    const groups = groupByDate(notifications);

    return (
        <AppLayout>
            <PageTransition>
                <div className="page-shell space-y-6 max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-blue-500/[0.03] p-8 mt-4">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/10 shadow-sm">
                                <Bell className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-extrabold tracking-tight font-heading text-foreground">
                                        Notifications
                                    </h1>
                                    {unreadCount > 0 && (
                                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                            {unreadCount} Unread
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-base">
                                    Stay informed about all work activities, approvals, and updates.
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markAllAsRead()}
                                    className="gap-2 shrink-0 self-start"
                                >
                                    <CheckCheck className="h-4 w-4" />
                                    Mark All Read
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-12 text-center bg-card/50">
                            <Bell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold text-foreground">No Notifications</h3>
                            <p className="text-muted-foreground mt-1">
                                You're all caught up! Notifications will appear here when there's new activity.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groups.map((group) => (
                                <div key={group.label}>
                                    <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">
                                        {group.label}
                                    </h2>
                                    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden divide-y divide-border/50">
                                        {group.items.map((n) => (
                                            <NotificationItem
                                                key={n.id}
                                                notification={n}
                                                onRead={markAsRead}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PageTransition>
        </AppLayout>
    );
}
