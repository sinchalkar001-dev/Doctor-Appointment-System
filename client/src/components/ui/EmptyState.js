import React from 'react';
import { cn } from '../../lib/cn';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-plate border border-dashed border-line-strong bg-surface p-6 sm:flex-row sm:items-start sm:p-8',
        className
      )}
    >
      {Icon ? (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold">{title}</h3>
        {description ? <p className="mt-1 max-w-prose text-ink-muted">{description}</p> : null}
        {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
