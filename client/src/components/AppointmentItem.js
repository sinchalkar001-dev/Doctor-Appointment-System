import React from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import Button from './ui/Button';
import DepartmentTile from './ui/DepartmentTile';
import StatusBadge from './ui/StatusBadge';
import { cn } from '../lib/cn';
import { formatDate, formatFee, formatTime, parseDateKey } from '../lib/format';

function DateBlock({ value, muted }) {
  const date = parseDateKey(value);
  return (
    <time
      dateTime={value || undefined}
      className={cn(
        'flex h-[4.5rem] w-16 shrink-0 flex-col items-center justify-center rounded-lg border text-center',
        muted ? 'border-dashed border-line-strong bg-surface' : 'border-line bg-surface-muted'
      )}
    >
      <span className="text-xs font-semibold text-ink-muted">{date ? format(date, 'MMM') : ''}</span>
      <span className={cn('tabular text-2xl font-extrabold leading-tight', muted ? 'text-ink-muted' : 'text-ink')}>
        {date ? format(date, 'd') : '?'}
      </span>
      <span className="text-xs text-ink-muted">{date ? format(date, 'EEE') : ''}</span>
    </time>
  );
}

export default function AppointmentItem({ appointment, onCancel }) {
  const { doctor, status, reason } = appointment;
  const doctorName = doctor?.name || 'Doctor no longer listed';

  const cancelButton = onCancel ? (
    <Button
      variant="danger-ghost"
      size="sm"
      onClick={() => onCancel(appointment)}
      aria-label={`Cancel appointment with ${doctorName} on ${formatDate(appointment.date)}`}
    >
      Cancel
    </Button>
  ) : null;

  return (
    <li className="plate flex gap-4 p-4 sm:items-center sm:gap-5 sm:p-5">
      <DateBlock value={appointment.date} muted={status === 'cancelled'} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="text-lg font-bold leading-snug">{doctorName}</h3>
          <StatusBadge status={status} />
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-ink-soft">
          {doctor?.specialization ? (
            <span className="inline-flex items-center gap-2">
              <DepartmentTile department={doctor.specialization} size="xs" />
              {doctor.specialization}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {formatTime(appointment.time)}
          </span>
          {doctor?.fees !== undefined && doctor?.fees !== null ? <span className="tabular">{formatFee(doctor.fees)}</span> : null}
        </p>

        {reason ? (
          <p className="mt-2 line-clamp-2 text-[15px] text-ink-muted">
            <span className="font-semibold text-ink-soft">Reason: </span>
            {reason}
          </p>
        ) : null}

        {cancelButton ? <div className="-ml-3 mt-2 sm:hidden">{cancelButton}</div> : null}
      </div>

      {cancelButton ? <div className="hidden shrink-0 sm:block">{cancelButton}</div> : null}
    </li>
  );
}
