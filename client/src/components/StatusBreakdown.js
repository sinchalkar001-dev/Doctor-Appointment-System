import React, { useState } from 'react';
import { STATUS_META } from './ui/StatusBadge';
import { cn } from '../lib/cn';
import { pluralize } from '../lib/format';

const ORDER = ['pending', 'confirmed', 'completed', 'cancelled'];

/**
 * One stacked bar of appointment statuses. Status colours are reserved for
 * status, segments are split by 2px surface gaps, and the legend carries every
 * value as text, so the chart never relies on colour alone.
 */
export default function StatusBreakdown({ counts }) {
  const [active, setActive] = useState(null);
  const total = ORDER.reduce((sum, key) => sum + (counts[key] || 0), 0);
  const share = (value) => (total ? Math.round((value / total) * 100) : 0);

  const segments = [];
  let offset = 0;
  ORDER.forEach((key) => {
    const value = counts[key] || 0;
    if (value > 0) {
      const width = (value / total) * 100;
      segments.push({ key, value, width, center: offset + width / 2 });
      offset += width;
    }
  });

  const activeSegment = segments.find((segment) => segment.key === active);
  const summary = ORDER.map((key) => `${STATUS_META[key].label} ${counts[key] || 0}`).join(', ');

  return (
    <section aria-labelledby="status-breakdown-title" className="plate p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="status-breakdown-title" className="text-lg font-bold">
          Appointments by status
        </h2>
        <p className="tabular text-sm text-ink-muted">{pluralize(total, 'appointment')}</p>
      </div>

      {total === 0 ? (
        <p className="mt-4 text-ink-muted">No appointments have been booked yet.</p>
      ) : (
        <>
          <div className="relative mt-6">
            {activeSegment ? (
              <div
                role="presentation"
                className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-sign px-2.5 py-1.5 text-sm text-ink-inverse shadow-overlay"
                style={{ left: `${Math.min(Math.max(activeSegment.center, 10), 90)}%` }}
              >
                <span className="font-semibold">{STATUS_META[activeSegment.key].label}</span>{' '}
                <span className="tabular text-sign-muted">
                  {activeSegment.value} of {total}, {share(activeSegment.value)}%
                </span>
              </div>
            ) : null}
            <div role="img" aria-label={`Appointments by status: ${summary}`} className="flex h-5 w-full gap-[2px]">
              {segments.map((segment, index) => (
                <div
                  key={segment.key}
                  onMouseEnter={() => setActive(segment.key)}
                  onMouseLeave={() => setActive(null)}
                  style={{ width: `${segment.width}%` }}
                  className={cn(
                    'h-full min-w-[6px] transition-opacity duration-150',
                    STATUS_META[segment.key].fill,
                    index === 0 && 'rounded-l-[4px]',
                    index === segments.length - 1 && 'rounded-r-[4px]',
                    active && active !== segment.key && 'opacity-40'
                  )}
                />
              ))}
            </div>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
            {ORDER.map((key) => {
              const meta = STATUS_META[key];
              const Icon = meta.icon;
              const value = counts[key] || 0;
              return (
                <li key={key} className="flex min-w-0 items-baseline justify-between gap-3 sm:block">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                    <span aria-hidden="true" className={cn('h-3 w-3 shrink-0 rounded-[3px]', meta.fill)} />
                    <Icon className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="truncate">{meta.label}</span>
                  </p>
                  <p className="sm:mt-1">
                    <span className="tabular text-2xl font-extrabold text-ink">{value}</span>{' '}
                    <span className="tabular text-sm text-ink-muted">{share(value)}%</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
