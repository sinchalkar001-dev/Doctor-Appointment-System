import React, { useState } from 'react';
import { AlertCircle, ChevronDown, Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '../../lib/cn';

const HEIGHTS = {
  sm: 'h-11 text-[15px]',
  md: 'h-12 text-base',
  lg: 'h-14 text-lg',
};

export function controlClasses({ invalid = false, hasLeading = false, hasTrailing = false, fullWidth = true, className } = {}) {
  return cn(
    'block rounded-control border bg-surface text-ink transition-[border-color,box-shadow] duration-150',
    'placeholder:text-ink-muted/80 focus:outline-none focus:ring-[3px] disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted',
    invalid
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : 'border-line-strong hover:border-ink-muted/60 focus:border-action focus:ring-action/15',
    hasLeading ? 'pl-11' : 'pl-3.5',
    hasTrailing ? 'pr-11' : 'pr-3.5',
    fullWidth ? 'w-full' : 'w-auto',
    className
  );
}

/** The id to put in aria-describedby for a field's message, if it has one. */
export function describedBy(id, { error, hint } = {}) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-danger-ink">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

/** Visible label, optional marker, and a hint or error below the control. */
export function Field({ id, label, hint, error, optional = false, className, children }) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-semibold text-ink">
          {label}
        </label>
        {optional ? <span className="text-sm text-ink-muted">Optional</span> : null}
      </div>
      {children}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <div id={`${id}-hint`} className="mt-2 text-sm text-ink-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef(function Input(
  { leadingIcon: LeadingIcon, trailing, invalid = false, size = 'md', fullWidth = true, className, ...props },
  ref
) {
  const control = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={controlClasses({
        invalid,
        fullWidth,
        hasLeading: Boolean(LeadingIcon),
        hasTrailing: Boolean(trailing),
        className: cn(HEIGHTS[size] || HEIGHTS.md, className),
      })}
      {...props}
    />
  );

  if (!LeadingIcon && !trailing) return control;

  return (
    <div className={cn('relative', !fullWidth && 'inline-block')}>
      {LeadingIcon ? (
        <LeadingIcon
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      ) : null}
      {control}
      {trailing ? <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div> : null}
    </div>
  );
});

export const Select = React.forwardRef(function Select(
  { invalid = false, size = 'md', className, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={controlClasses({
          invalid,
          hasTrailing: true,
          className: cn(HEIGHTS[size] || HEIGHTS.md, 'cursor-pointer appearance-none', className),
        })}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
    </div>
  );
});

export const Textarea = React.forwardRef(function Textarea({ invalid = false, className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={controlClasses({ invalid, className: cn('min-h-[7rem] resize-y py-3 text-base leading-relaxed', className) })}
      {...props}
    />
  );
});

export const PasswordInput = React.forwardRef(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      leadingIcon={Lock}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label="Show password"
          aria-pressed={visible}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      }
    />
  );
});
