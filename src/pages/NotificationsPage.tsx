import { useState } from 'react';
import { Bell, CheckCheck, Loader2, Trash2, Inbox, Filter } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types/database';

type FilterCategory = 'all' | 'works' | 'approvals' | 'updates' | 'issues';

const categoryConfig: Record<FilterCategory, { label: string; icon: string; types: NotificationType[] }> = {
    all: { label: 'All', icon: '📋', types: [] },
    works: { label: 'Works', icon: '🏗️', types: ['work_created', 'work_updated', 'tender_created', 'hr_created', 'quotation_created'] },
    approvals: { label: 'Approvals', icon: '🛡️', types: ['r2_requested', 'r2_approved', 'r2_rejected'] },
    updates: { label: 'Activity', icon: '📊', types: ['checklist_updated', 'financial_updated'] },
    issues: { label: 'Issues', icon: '⚠️', types: ['issue_raised'] },
};

function groupByDate(notifications: Notification[]) {
    const groups: { label: string; items: Notification[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayItems: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const thisWeekItems: Notification[] = [];
    const earlierItems: Notification[] = [];

    for (const n of notifications) {
        const d = new Date(n.created_at);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime()) todayItems.push(n);
        else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
        else if (d.getTime() >= weekAgo.getTime()) thisWeekItems.push(n);
        else earlierItems.push(n);
    }

    if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
    if (thisWeekItems.length > 0) groups.push({ label: 'This Week', items: thisWeekItems });
    if (earlierItems.length > 0) groups.push({ label: 'Earlier', items: earlierItems });

    return groups;
}

export default function NotificationsPage() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
    const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    let filtered = activeFilter === 'all'
        ? notifications
        : notifications.filter((n) => categoryConfig[activeFilter].types.includes(n.type));

    if (showUnreadOnly) {
        filtered = filtered.filter((n) => !n.read);
    }

    const groups = groupByDate(filtered);

    const categoryCounts = (Object.keys(categoryConfig) as FilterCategory[]).reduce((acc, cat) => {
        const count = cat === 'all'
            ? notifications.filter((n) => !n.read).length
            : notifications.filter((n) => !n.read && categoryConfig[cat].types.includes(n.type)).length;
        acc[cat] = count;
        return acc;
    }, {} as Record<FilterCategory, number>);

    return (
        <AppLayout>
            <PageTransition>
                <div className="page-shell space-y-6">
                    {/* Header */}
                    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-blue-500/[0.03] p-8 mt-4">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
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
                                        <span className="bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-xs font-bold px-2.5 py-0.5 rounded-full animate-in fade-in zoom-in">
                                            {unreadCount} Unread
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-base">
                                    Stay informed about work activities, approvals, and team updates.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-start">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => markAllAsRead()}
                                        className="gap-2"
                                    >
                                        <CheckCheck className="h-4 w-4" />
                                        Mark All Read
                                    </Button>
                                )}
                                {notifications.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
                                                clearAll();
                                            }
                                        }}
                                        className="gap-2 text-muted-foreground hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Clear All
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Category Filter + Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="flex gap-1.5 bg-muted/50 rounded-xl p-1 border border-border/50">
                            {(Object.keys(categoryConfig) as FilterCategory[]).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveFilter(cat)}
                                    className={cn(
                                        'flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-lg transition-all',
                                        activeFilter === cat
                                            ? 'bg-background text-foreground shadow-sm border border-border/50'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    )}
                                >
                                    <span className="text-sm">{categoryConfig[cat].icon}</span>
                                    {categoryConfig[cat].label}
                                    {categoryCounts[cat] > 0 && (
                                        <span className={cn(
                                            'text-[9px] font-black min-w-[16px] h-4 flex items-center justify-center rounded-full px-1',
                                            activeFilter === cat
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted-foreground/15 text-muted-foreground'
                                        )}>
                                            {categoryCounts[cat]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowUnreadOnly((prev) => !prev)}
                            className={cn(
                                'flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg border transition-all',
                                showUnreadOnly
                                    ? 'bg-primary/10 border-primary/20 text-primary'
                                    : 'border-border/50 text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Unread Only
                        </button>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-16 text-center bg-card/50">
                            <div className="rounded-2xl bg-muted/30 p-5 inline-flex mb-5">
                                <Inbox className="h-10 w-10 text-muted-foreground/25" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                                {showUnreadOnly ? 'No Unread Notifications' : 'No Notifications'}
                            </h3>
                            <p className="text-muted-foreground mt-1.5 max-w-xs mx-auto">
                                {showUnreadOnly
                                    ? "You've read everything! Toggle off the filter to see all notifications."
                                    : "You're all caught up! Notifications will appear here when there's new activity."
                                }
                            </p>
                            {showUnreadOnly && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setShowUnreadOnly(false)}
                                >
                                    Show All Notifications
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groups.map((group) => (
                                <div key={group.label}>
                                    <div className="flex items-center gap-3 mb-3 px-1">
                                        <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                            {group.label}
                                        </h2>
                                        <div className="flex-1 h-px bg-border/30" />
                                        <span className="text-[10px] font-bold text-muted-foreground/50">
                                            {group.items.length} {group.items.length === 1 ? 'notification' : 'notifications'}
                                        </span>
                                    </div>
                                    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden divide-y divide-border/30">
                                        {group.items.map((n) => (
                                            <NotificationItem
                                                key={n.id}
                                                notification={n}
                                                onRead={markAsRead}
                                                onDelete={deleteNotification}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats footer */}
                    {notifications.length > 0 && (
                        <div className="flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 py-4">
                            <span>{notifications.length} total</span>
                            <span>•</span>
                            <span>{unreadCount} unread</span>
                            <span>•</span>
                            <span>{notifications.length - unreadCount} read</span>
                        </div>
                    )}
                </div>
            </PageTransition>
        </AppLayout>
    );
}
