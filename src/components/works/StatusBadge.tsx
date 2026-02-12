import { cn } from '@/lib/utils';
import type { WorkStatus } from '@/types/database';

interface StatusBadgeProps {
  status: WorkStatus;
  size?: 'sm' | 'md';
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
    label: 'Running',
  },
  'Review': {
    bg: 'bg-status-review-bg',
    text: 'text-status-review',
    label: 'Review',
  },
  'Completed': {
    bg: 'bg-status-completed-bg',
    text: 'text-status-completed',
    label: 'Completed',
  },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'status-badge',
        config.bg,
        config.text,
        'whitespace-nowrap',
        size === 'md' && 'px-3 py-1 text-sm'
      )}
    >
      {config.label}
    </span>
  );
}
