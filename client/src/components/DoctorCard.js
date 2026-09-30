import React from 'react';
import { Award, CalendarPlus, Phone } from 'lucide-react';
import Button from './ui/Button';
import DepartmentTile from './ui/DepartmentTile';
import { cn } from '../lib/cn';
import { HUE_BG, getDepartment } from '../lib/departments';
import { formatFee, pluralize } from '../lib/format';

/** A doctor's door plate: department band and pictogram, name, experience, fee. */
export default function DoctorCard({ doctor, onBook }) {
  const department = getDepartment(doctor.specialization);
  const experience = Number(doctor.experience) || 0;
  const phoneHref = doctor.phone ? `tel:${doctor.phone.replace(/[^\d+]/g, '')}` : null;

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-plate border border-line bg-surface">
      <div aria-hidden="true" className={cn('h-1.5', HUE_BG[department.hue])} />
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
          <DepartmentTile department={department} size="sm" />
          <span className="truncate">{doctor.specialization}</span>
        </p>

        <h3 className="mt-4 text-xl font-bold leading-snug">{doctor.name}</h3>

        <ul className="mt-2 space-y-1 text-[15px] text-ink-soft">
          {experience > 0 ? (
            <li className="flex items-center gap-2">
              <Award className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
              {pluralize(experience, 'year')} of experience
            </li>
          ) : null}
          {phoneHref ? (
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <a href={phoneHref} className="rounded-sm underline-offset-4 hover:text-ink hover:underline">
                {doctor.phone}
              </a>
            </li>
          ) : null}
        </ul>

        <div className="mt-auto pt-6">
          <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
            <p className="leading-tight">
              <span className="block text-sm text-ink-muted">Consultation fee</span>
              <span className="tabular text-2xl font-extrabold text-ink">{formatFee(doctor.fees)}</span>
            </p>
            <Button onClick={() => onBook(doctor)} aria-label={`Book appointment with ${doctor.name}`}>
              <CalendarPlus aria-hidden="true" />
              Book
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
