import React, { useId } from 'react';
import { cn } from '../lib/cn';
import { formatTime, pluralize } from '../lib/format';
import { SLOT_LENGTHS, WEEKDAYS, availabilityProblems, slotTimes } from '../lib/schedule';
import { Input } from './ui/Field';

const chipClass =
  'cursor-pointer rounded-control border border-line-strong bg-surface text-ink transition-colors hover:border-ink-muted peer-checked:border-action peer-checked:bg-action peer-checked:text-ink-inverse peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus';

/**
 * Weekly working pattern: days, hours, an optional break and slot length.
 * Controlled: pass `value` and receive the next value through `onChange`.
 */
export default function AvailabilityEditor({ value, onChange, showProblems = true }) {
  const uid = useId();
  const hasBreak = Boolean(value.breakStart || value.breakEnd);
  const slots = slotTimes(value);
  const problems = availabilityProblems(value);

  const update = (patch) => onChange({ ...value, ...patch });

  const toggleDay = (day) => {
    const days = value.days.includes(day) ? value.days.filter((d) => d !== day) : [...value.days, day];
    update({ days: days.sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">Working days</legend>
        <div className="mt-2.5 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => (
            <label key={day.value} className="relative block">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={value.days.includes(day.value)}
                onChange={() => toggleDay(day.value)}
              />
              <span className={cn('flex h-11 items-center justify-center text-sm font-semibold', chipClass)}>
                <span aria-hidden="true">{day.short}</span>
                <span className="sr-only">{day.long}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${uid}start`} className="mb-2 block text-[15px] font-semibold text-ink">
            Starts
          </label>
          <Input
            id={`${uid}start`}
            type="time"
            step="900"
            size="sm"
            value={value.start}
            onChange={(event) => update({ start: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${uid}end`} className="mb-2 block text-[15px] font-semibold text-ink">
            Ends
          </label>
          <Input
            id={`${uid}end`}
            type="time"
            step="900"
            size="sm"
            value={value.end}
            onChange={(event) => update({ end: event.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 text-[15px] font-semibold text-ink">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-line-strong accent-[rgb(var(--color-action))]"
            checked={hasBreak}
            onChange={(event) =>
              update(event.target.checked ? { breakStart: '13:00', breakEnd: '14:00' } : { breakStart: '', breakEnd: '' })
            }
          />
          Daily break
        </label>
        {hasBreak ? (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${uid}break-start`} className="mb-2 block text-sm font-semibold text-ink-soft">
                Break starts
              </label>
              <Input
                id={`${uid}break-start`}
                type="time"
                step="900"
                size="sm"
                value={value.breakStart}
                onChange={(event) => update({ breakStart: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor={`${uid}break-end`} className="mb-2 block text-sm font-semibold text-ink-soft">
                Break ends
              </label>
              <Input
                id={`${uid}break-end`}
                type="time"
                step="900"
                size="sm"
                value={value.breakEnd}
                onChange={(event) => update({ breakEnd: event.target.value })}
              />
            </div>
          </div>
        ) : null}
      </div>

      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">Appointment length</legend>
        <div className="mt-2.5 grid grid-cols-5 gap-1.5">
          {SLOT_LENGTHS.map((minutes) => (
            <label key={minutes} className="relative block">
              <input
                type="radio"
                name={`${uid}slot-length`}
                className="peer sr-only"
                checked={Number(value.slotMinutes) === minutes}
                onChange={() => update({ slotMinutes: minutes })}
              />
              <span className={cn('tabular flex h-11 items-center justify-center text-sm font-semibold', chipClass)}>
                {minutes} min
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div aria-live="polite">
        {showProblems && problems.length > 0 ? (
          <p className="rounded-control border border-danger-line bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger-ink">
            {problems[0]}
          </p>
        ) : (
          <p className="rounded-control border border-line bg-surface-muted px-4 py-3 text-[15px] text-ink-soft">
            <span className="font-semibold text-ink">{pluralize(slots.length, 'appointment')} per working day</span>
            {slots.length > 0 ? `, from ${formatTime(slots[0])} to the last start at ${formatTime(slots[slots.length - 1])}.` : '.'}
          </p>
        )}
      </div>
    </div>
  );
}
