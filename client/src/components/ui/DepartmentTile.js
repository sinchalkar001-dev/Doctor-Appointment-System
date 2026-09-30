import React from 'react';
import { HUE_BG, getDepartment } from '../../lib/departments';
import { cn } from '../../lib/cn';

const SIZES = {
  xs: 'h-5 w-5 rounded-[4px] [&_svg]:h-3 [&_svg]:w-3',
  sm: 'h-6 w-6 rounded-[5px] [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-8 w-8 rounded-md [&_svg]:h-[18px] [&_svg]:w-[18px]',
  lg: 'h-11 w-11 rounded-lg [&_svg]:h-6 [&_svg]:w-6',
};

/** A department's pictogram: a coloured square with a white icon, like a hospital sign. */
export default function DepartmentTile({ department, size = 'md', className }) {
  const info = department && typeof department === 'object' ? department : getDepartment(department);
  const Icon = info.icon;
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center text-white', HUE_BG[info.hue], SIZES[size], className)}
    >
      <Icon strokeWidth={2.25} />
    </span>
  );
}
