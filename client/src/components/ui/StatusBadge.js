import React from 'react';
import { CheckCircle2, Hourglass, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export const STATUS_META = {
  pending: {
    label: 'Pending',
    icon: Hourglass,
    badge: 'border-pending-line bg-pending-soft text-pending-ink',
    fill: 'bg-pending',
    meaning: 'Waiting for the clinic to confirm.',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    badge: 'border-confirmed-line bg-confirmed-soft text-confirmed-ink',
    fill: 'bg-confirmed',
    meaning: 'The clinic has approved the time.',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    badge: 'border-cancelled-line bg-cancelled-soft text-cancelled-ink',
    fill: 'bg-cancelled',
    meaning: 'No longer scheduled.',
  },
};

/** Status always carries an icon and a word, never colour alone. */
export default function StatusBadge({ status, className }) {
  const meta = STATUS_META[status] || { ...STATUS_META.pending, label: status || 'Unknown' };
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip border px-2 py-1 text-[13px] font-semibold leading-none',
        meta.badge,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
