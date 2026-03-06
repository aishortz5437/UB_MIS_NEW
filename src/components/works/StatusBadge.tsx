import { cn } from '@/lib/utils';
import type { WorkStatus } from '@/types/database';

interface StatusBadgeProps {
  status: WorkStatus;
  size?: 'sm' | 'md';
  pendingR2?: boolean;
}

const statusConfig: Record<WorkStatus, { bg: string; text: string; label: string }> = {
  'Pipeline': {
    bg: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10',
    text: '',
    label: 'Pipeline C1',
  },
  'Running': {
    bg: 'bg-status-progress-bg',
    text: 'text-status-progress',
    label: 'Running R1',
  },
  'Running R1': {
    bg: 'bg-status-progress-bg',
    text: 'text-status-progress',
    label: 'Running R1',
  },
  'Running R2': {
    bg: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-700/10 dark:bg-amber-500/10 dark:text-amber-400',
    text: '',
    label: 'Running R2',
  },
  'Completed': {
    bg: 'bg-status-completed-bg',
    text: 'text-status-completed',
    label: 'Completed',
  },
};

export function StatusBadge({ status, size = 'sm', pendingR2 }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'status-badge relative flex items-center gap-1.5',
        config.bg,
        config.text,
        'whitespace-nowrap',
        size === 'md' && 'px-3 py-1 text-sm'
      )}
    >
      {pendingR2 && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      )}
      {pendingR2 ? 'Pending R2 Approval' : config.label}
    </span>
  );
}
