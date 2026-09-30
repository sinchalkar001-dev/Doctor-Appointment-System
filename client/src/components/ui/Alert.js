import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/cn';

const TONES = {
  danger: { icon: AlertCircle, className: 'border-danger-line bg-danger-soft text-danger-ink', role: 'alert' },
  warning: { icon: AlertTriangle, className: 'border-pending-line bg-pending-soft text-pending-ink', role: 'status' },
  info: { icon: Info, className: 'border-line bg-surface-muted text-ink-soft', role: 'status' },
};

export default function Alert({ tone = 'danger', title, children, action, className }) {
  const meta = TONES[tone] || TONES.danger;
  const Icon = meta.icon;
  return (
    <div
      role={meta.role}
      className={cn('flex flex-wrap items-start gap-x-3 gap-y-3 rounded-control border p-4 text-[15px]', meta.className, className)}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-48">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5' : undefined}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
