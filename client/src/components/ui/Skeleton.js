import React from 'react';
import { cn } from '../../lib/cn';

/** Placeholder block that holds the space content will take, so nothing jumps on load. */
export default function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-surface-sunken', className)} />;
}
