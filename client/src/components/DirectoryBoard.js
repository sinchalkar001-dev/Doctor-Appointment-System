import React from 'react';
import { ArrowRight, LayoutGrid, Signpost } from 'lucide-react';
import DepartmentTile from './ui/DepartmentTile';
import { cn } from '../lib/cn';
import { getDepartment } from '../lib/departments';
import { pluralize } from '../lib/format';

function DirectoryRow({ label, count, department, active, onSelect, index }) {
  return (
    <li
      className="origin-top animate-flip-in border-b border-sign-line last:border-b-0"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="group relative flex w-full items-center gap-3.5 px-5 py-3 text-left transition-colors hover:bg-sign-raised focus-visible:[outline-offset:-3px] aria-pressed:bg-sign-raised"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-signal opacity-0 transition-opacity group-aria-pressed:opacity-100"
        />
        {department ? (
          <DepartmentTile department={department} size="md" />
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sign-line">
            <LayoutGrid className="h-[18px] w-[18px]" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[17px] font-semibold">{label}</span>
        <span className="tabular text-sm text-sign-muted">
          {count}
          <span className="sr-only"> {count === 1 ? 'doctor' : 'doctors'}</span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-signal opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-aria-pressed:opacity-100"
        />
      </button>
    </li>
  );
}

/**
 * The lobby directory sign: every department with its pictogram and how many
 * doctors practise there. Choosing a row filters the doctor list.
 */
export default function DirectoryBoard({ departments, total, selected, onSelect, loading, error }) {
  return (
    <section
      aria-labelledby="directory-title"
      className="on-sign self-start overflow-hidden rounded-plate bg-sign text-ink-inverse shadow-overlay"
    >
      <div className="flex items-center justify-between gap-4 px-5 pb-3.5 pt-5">
        <h2 id="directory-title" className="flex items-center gap-2 text-lg font-bold text-ink-inverse">
          <Signpost className="h-5 w-5 text-signal" aria-hidden="true" />
          Departments
        </h2>
        {!loading && !error ? <p className="text-sm text-sign-muted">{pluralize(total, 'doctor')}</p> : null}
      </div>

      {loading ? (
        <ul aria-hidden="true" className="border-t border-sign-line">
          {Array.from({ length: 7 }, (_, index) => (
            <li key={index} className="flex items-center gap-3.5 border-b border-sign-line px-5 py-3 last:border-b-0">
              <span className="h-8 w-8 animate-pulse rounded-md bg-sign-raised" />
              <span className={cn('h-4 animate-pulse rounded bg-sign-raised', index % 2 ? 'w-32' : 'w-40')} />
            </li>
          ))}
        </ul>
      ) : error ? (
        <p className="border-t border-sign-line px-5 py-6 text-sign-muted">
          The directory is unavailable right now. The doctor list below explains what to do.
        </p>
      ) : departments.length === 0 ? (
        <p className="border-t border-sign-line px-5 py-6 text-sign-muted">No departments are listed yet.</p>
      ) : (
        <ul className="max-h-[34rem] overflow-y-auto border-t border-sign-line">
          <DirectoryRow
            label="All departments"
            count={total}
            active={selected === ''}
            onSelect={() => onSelect('')}
            index={0}
          />
          {departments.map((department, index) => (
            <DirectoryRow
              key={department.name}
              label={department.name}
              count={department.count}
              department={getDepartment(department.name)}
              active={selected === department.name}
              onSelect={() => onSelect(department.name)}
              index={index + 1}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
