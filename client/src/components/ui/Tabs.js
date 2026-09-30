import React, { useRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * ARIA tabs with roving focus: arrow keys, Home and End move between tabs.
 * `variant="underline"` is for page sections, `variant="segmented"` for filters.
 */
export function TabList({ tabs, value, onChange, label, idPrefix, variant = 'underline', bordered = true, className }) {
  const refs = useRef([]);
  const segmented = variant === 'segmented';

  function handleKeyDown(event, index) {
    const last = tabs.length - 1;
    let next = null;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'scrollbar-none flex max-w-full overflow-x-auto',
        segmented
          ? 'w-fit gap-1 rounded-control bg-surface-sunken p-1'
          : cn('gap-4 sm:gap-6', bordered && 'shadow-[inset_0_-1px_0_rgb(var(--color-line))]'),
        className
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id || 'all'}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id || 'all'}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold transition-colors',
              segmented
                ? cn(
                    'h-9 rounded-[6px] px-3 text-sm focus-visible:[outline-offset:0px]',
                    selected ? 'bg-surface text-ink shadow-raise' : 'text-ink-muted hover:text-ink'
                  )
                : cn(
                    'h-12 border-b-[3px] text-[15px] focus-visible:[outline-offset:-2px]',
                    selected ? 'border-action text-ink' : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink'
                  )
            )}
          >
            {Icon ? <Icon className="hidden h-[18px] w-[18px] sm:block" aria-hidden="true" /> : null}
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span
                className={cn(
                  'tabular min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs font-bold',
                  selected ? 'bg-action text-ink-inverse' : 'bg-surface text-ink-muted'
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, value, className, children }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${value || 'all'}`} className={className}>
      {children}
    </div>
  );
}
