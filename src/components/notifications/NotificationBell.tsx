import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import type { NotificationType } from '@/types/database';

const DROPDOWN_MAX = 8;

type FilterTab = 'all' | 'works' | 'approvals' | 'updates';

const filterConfig: Record<FilterTab, { label: string; types: NotificationType[] }> = {
    all: { label: 'All', types: [] },
    works: { label: 'Works', types: ['work_created', 'work_updated', 'tender_created', 'hr_created', 'quotation_created'] },
    approvals: { label: 'Approvals', types: ['r2_requested', 'r2_approved', 'r2_rejected'] },
    updates: { label: 'Updates', types: ['checklist_updated', 'financial_updated'] },
};

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        if (open) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [open]);

    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter((n) => filterConfig[activeTab].types.includes(n.type));

    const displayedNotifications = filteredNotifications.slice(0, DROPDOWN_MAX);
    const filteredUnread = filteredNotifications.filter((n) => !n.read).length;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    'relative flex items-center justify-center rounded-xl p-2.5 transition-all duration-200',
                    'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    open && 'bg-sidebar-accent text-sidebar-foreground ring-2 ring-primary/20',
                    unreadCount > 0 && !open && 'hover:scale-105'
                )}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <Bell className={cn('h-5 w-5 transition-transform', unreadCount > 0 && 'animate-[wiggle_0.5s_ease-in-out]')} />

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-lg shadow-red-500/30">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-[360px] max-h-[75vh] overflow-hidden rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl shadow-black/10 z-50"
                    style={{ animation: 'slideUp 0.2s ease-out' }}
                >
                    {/* Header */}
                    <div className="px-4 pt-4 pb-2">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                    <Bell className="h-4 w-4 text-primary" />
                                </div>
                                <h3 className="text-sm font-extrabold tracking-tight">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead()}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors rounded-md px-2 py-1 hover:bg-primary/5"
                                >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    Read all
                                </button>
                            )}
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                            {(Object.keys(filterConfig) as FilterTab[]).map((tab) => {
                                const tabUnread = tab === 'all'
                                    ? unreadCount
                                    : notifications.filter((n) => !n.read && filterConfig[tab].types.includes(n.type)).length;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-md transition-all',
                                            activeTab === tab
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {filterConfig[tab].label}
                                        {tabUnread > 0 && (
                                            <span className={cn(
                                                'text-[9px] font-black min-w-[14px] h-[14px] flex items-center justify-center rounded-full',
                                                activeTab === tab
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted-foreground/15 text-muted-foreground'
                                            )}>
                                                {tabUnread}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-border/50" />

                    {/* List */}
                    <div className="max-h-[50vh] overflow-y-auto">
                        {displayedNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                <div className="rounded-2xl bg-muted/30 p-4 mb-4">
                                    <Inbox className="h-8 w-8 text-muted-foreground/25" />
                                </div>
                                <p className="text-sm font-bold text-foreground">All caught up!</p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                                    {activeTab === 'all'
                                        ? 'No notifications at the moment.'
                                        : `No ${filterConfig[activeTab].label.toLowerCase()} notifications.`
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/30">
                                {displayedNotifications.map((n) => (
                                    <NotificationItem
                                        key={n.id}
                                        notification={n}
                                        onRead={markAsRead}
                                        compact
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="border-t border-border/50 px-4 py-2.5 bg-muted/20">
                            <Link
                                to="/notifications"
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors py-1"
                            >
                                View All Notifications
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Animation keyframes */}
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0); }
                    25% { transform: rotate(-8deg); }
                    75% { transform: rotate(8deg); }
                }
            `}</style>
        </div>
    );
}
