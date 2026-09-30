import React from 'react';
import { cn } from '../lib/cn';

/** Sign-tile mark: a white cross on navy with a yellow wayfinding marker. */
export default function Logo({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="7" className="fill-sign" />
        <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" className="fill-white" />
        <rect x="21" y="21" width="5" height="5" rx="1.25" className="fill-signal" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight text-ink">E-Medico</span>
    </span>
  );
}
