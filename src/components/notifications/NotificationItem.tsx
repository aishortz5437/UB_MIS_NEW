import { Link } from 'react-router-dom';
import {
    Briefcase,
    FileCheck2,
    Receipt,
    ShieldCheck,
    ShieldX,
    Clock,
    IndianRupee,
    ClipboardCheck,
    Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types/database';

const iconMap: Record<NotificationType, { icon: typeof Briefcase; color: string; bg: string }> = {
    work_created: { icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    work_updated: { icon: Pencil, color: 'text-slate-600', bg: 'bg-slate-500/10' },
    tender_created: { icon: FileCheck2, color: 'text-orange-600', bg: 'bg-orange-500/10' },
    hr_created: { icon: Receipt, color: 'text-violet-600', bg: 'bg-violet-500/10' },
    r2_requested: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    r2_approved: { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    r2_rejected: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-500/10' },
    checklist_updated: { icon: ClipboardCheck, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
    financial_updated: { icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-500/10' },
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    compact?: boolean; // true for dropdown, false for full page
}

export function NotificationItem({ notification, onRead, compact = false }: NotificationItemProps) {
    const config = iconMap[notification.type] || iconMap.work_created;
    const Icon = config.icon;

    const handleClick = () => {
        if (!notification.read) {
            onRead(notification.id);
        }
    };

    const content = (
        <div
            className={cn(
                'group flex items-start gap-3 rounded-xl transition-all duration-200 cursor-pointer',
                compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
                notification.read
                    ? 'opacity-60 hover:opacity-80'
                    : 'bg-primary/[0.03] hover:bg-primary/[0.06]'
            )}
            onClick={handleClick}
        >
            {/* Icon */}
            <div className={cn('shrink-0 rounded-lg p-2 border', config.bg)}>
                <Icon className={cn('h-4 w-4', config.color)} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <p className={cn(
                    'text-sm leading-snug',
                    notification.read ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground'
                )}>
                    {notification.title}
                </p>
                {!compact && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {notification.message}
                    </p>
                )}
                <p className="text-[10px] font-bold text-muted-foreground/60 mt-1 uppercase tracking-wider">
                    {timeAgo(notification.created_at)}
                </p>
            </div>

            {/* Unread dot */}
            {!notification.read && (
                <div className="shrink-0 mt-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
            )}
        </div>
    );

    if (notification.link) {
        return (
            <Link to={notification.link} className="block" onClick={handleClick}>
                {content}
            </Link>
        );
    }

    return content;
}
