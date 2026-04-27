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
    X,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types/database';

const iconMap: Record<NotificationType, { icon: typeof Briefcase; color: string; bg: string; ring: string }> = {
    work_created: { icon: Briefcase, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
    work_updated: { icon: Pencil, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', ring: 'ring-slate-500/20' },
    tender_created: { icon: FileCheck2, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-500/20' },
    hr_created: { icon: Receipt, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', ring: 'ring-violet-500/20' },
    quotation_created: { icon: Briefcase, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', ring: 'ring-indigo-500/20' },
    r2_requested: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
    r2_approved: { icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
    r2_rejected: { icon: ShieldX, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
    checklist_updated: { icon: ClipboardCheck, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', ring: 'ring-cyan-500/20' },
    financial_updated: { icon: IndianRupee, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', ring: 'ring-green-500/20' },
    issue_raised: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
};

const categoryLabels: Record<NotificationType, string> = {
    work_created: 'New Work',
    work_updated: 'Updated',
    tender_created: 'Tender',
    hr_created: 'Hand Receipt',
    quotation_created: 'Quotation',
    r2_requested: 'R2 Request',
    r2_approved: 'Approved',
    r2_rejected: 'Rejected',
    checklist_updated: 'Checklist',
    financial_updated: 'Financial',
    issue_raised: 'Issue',
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

function getInitials(name: string): string {
    if (!name || name === 'Someone') return '?';
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    onDelete?: (id: string) => void;
    compact?: boolean; // true for dropdown, false for full page
}

export function NotificationItem({ notification, onRead, onDelete, compact = false }: NotificationItemProps) {
    const config = iconMap[notification.type] || iconMap.work_created;
    const Icon = config.icon;
    const actorName = notification.metadata?.actor || 'Someone';
    const initials = getInitials(actorName);
    const label = categoryLabels[notification.type] || 'Update';

    const handleClick = () => {
        if (!notification.read) {
            onRead(notification.id);
        }
    };

    const content = (
        <div
            className={cn(
                'group relative flex items-start gap-3 transition-all duration-200 cursor-pointer',
                compact ? 'px-3 py-3' : 'px-5 py-4',
                notification.read
                    ? 'opacity-60 hover:opacity-90'
                    : 'hover:bg-primary/[0.04]'
            )}
            onClick={handleClick}
        >
            {/* Unread indicator bar */}
            {!notification.read && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" />
            )}

            {/* Avatar / Icon area */}
            <div className="shrink-0 relative">
                {/* Actor avatar with initials */}
                <div className={cn(
                    'flex items-center justify-center rounded-full font-black text-[10px] ring-2',
                    compact ? 'h-8 w-8' : 'h-10 w-10',
                    config.bg, config.color, config.ring
                )}>
                    {initials}
                </div>
                {/* Type icon badge */}
                <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 bg-background border shadow-sm',
                )}>
                    <Icon className={cn('h-2.5 w-2.5', config.color)} />
                </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md',
                        config.bg, config.color
                    )}>
                        {label}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground/50">
                        {timeAgo(notification.created_at)}
                    </span>
                </div>
                <p className={cn(
                    'leading-snug',
                    compact ? 'text-[13px]' : 'text-sm',
                    notification.read ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground'
                )}>
                    {notification.title}
                </p>
                {!compact && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed line-clamp-2">
                        {notification.message}
                    </p>
                )}
                {compact && notification.message && (
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-1">
                        {notification.message}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-1 mt-1">
                {/* Unread dot */}
                {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/30" />
                )}
                {/* Delete button (visible on hover for full page) */}
                {!compact && onDelete && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-500/10 hover:text-red-600 text-muted-foreground/40"
                        title="Dismiss"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
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
