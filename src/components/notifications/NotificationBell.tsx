import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

const DROPDOWN_MAX = 8;

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
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

    const displayedNotifications = notifications.slice(0, DROPDOWN_MAX);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    'relative flex items-center justify-center rounded-lg p-2 transition-all duration-200',
                    'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    open && 'bg-sidebar-accent text-sidebar-foreground'
                )}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <Bell className="h-5 w-5" />

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-lg">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[70vh] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold tracking-tight">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-border/50">
                        {displayedNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                                <div className="rounded-full bg-muted/50 p-3 mb-3">
                                    <Bell className="h-6 w-6 text-muted-foreground/30" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">All caught up!</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    No new notifications at the moment.
                                </p>
                            </div>
                        ) : (
                            displayedNotifications.map((n) => (
                                <NotificationItem
                                    key={n.id}
                                    notification={n}
                                    onRead={markAsRead}
                                    compact
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="border-t px-4 py-2.5">
                            <Link
                                to="/notifications"
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:underline"
                            >
                                View All Notifications
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
