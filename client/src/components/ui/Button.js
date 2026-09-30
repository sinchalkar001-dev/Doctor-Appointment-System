import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary: 'bg-action text-ink-inverse hover:bg-action-hover active:bg-action-active',
  secondary:
    'border border-line-strong bg-surface text-ink hover:border-ink-muted hover:bg-surface-muted active:bg-surface-sunken',
  ghost: 'text-ink hover:bg-surface-sunken active:bg-line',
  danger: 'bg-danger text-ink-inverse hover:bg-danger-hover',
  'danger-ghost': 'text-danger-ink hover:bg-danger-soft active:bg-danger-line',
  // For use on navy sign panels.
  signal: 'bg-signal text-sign hover:bg-signal/90 active:bg-signal/80',
  'sign-ghost': 'border border-sign-line text-ink-inverse hover:bg-sign-raised active:bg-sign-line',
};

const SIZES = {
  sm: 'h-9 gap-1.5 px-3 text-sm [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-11 gap-2 px-4 text-[15px] [&_svg]:h-[18px] [&_svg]:w-[18px]',
  lg: 'h-12 gap-2 px-5 text-base [&_svg]:h-5 [&_svg]:w-5',
  xl: 'h-14 gap-2 px-6 text-base [&_svg]:h-5 [&_svg]:w-5',
  icon: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
  'icon-sm': 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4',
};

/** Class list for anything that should look like a button, including router links. */
export function buttonClasses({ variant = 'primary', size = 'md', block = false, loading = false, className } = {}) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-control font-semibold leading-none transition-colors duration-150 ease-out [&_svg]:shrink-0',
    loading ? 'cursor-progress' : 'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    block && 'w-full',
    className
  );
}

const Button = React.forwardRef(function Button(
  { variant, size, block, loading = false, loadingText, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, block, loading, className })}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

export default Button;
