import React from 'react';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
};

const TONES = {
  neutral: 'bg-surface-sunken text-ink-soft',
  brand: 'bg-sign text-ink-inverse',
};

export default function Avatar({ name, size = 'md', tone = 'neutral', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold',
        SIZES[size] || SIZES.md,
        TONES[tone] || TONES.neutral,
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
