import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import { appointmentAPI } from '../api';
import Alert from './ui/Alert';
import Button from './ui/Button';
import DepartmentTile from './ui/DepartmentTile';
import Skeleton from './ui/Skeleton';
import StatusBadge from './ui/StatusBadge';
import { FieldError, Input, Select, Textarea } from './ui/Field';
import { cn } from '../lib/cn';
import { formatDate, formatFee, formatTime, pluralize, sortableName, toDateKey } from '../lib/format';
import { SLOT_GROUPS, earliestBookableKey, upcomingDays } from '../lib/schedule';

const REASON_LIMIT = 500;

const choiceClass =
  'cursor-pointer rounded-control border border-line-strong bg-surface text-ink transition-colors hover:border-ink-muted peer-checked:border-action peer-checked:bg-action peer-checked:text-ink-inverse peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus';

function StepLabel({ number, as: Component = 'span', children, ...props }) {
  return (
    <Component className="flex items-center gap-2.5 text-base font-bold text-ink" {...props}>
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sign text-xs font-bold text-ink-inverse"
      >
        {number}
      </span>
      {children}
    </Component>
  );
}

function SelectedDoctor({ doctor }) {
  const experience = Number(doctor.experience) || 0;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-control border border-line bg-surface-muted p-3">
      <DepartmentTile department={doctor.specialization} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{doctor.name}</p>
        <p className="truncate text-sm text-ink-muted">
          {doctor.specialization}
          {experience > 0 ? `, ${pluralize(experience, 'year')} of experience` : ''}
        </p>
      </div>
      <p className="shrink-0 text-right leading-tight">
        <span className="block text-xs text-ink-muted">Fee</span>
        <span className="tabular font-bold text-ink">{formatFee(doctor.fees)}</span>
      </p>
    </div>
  );
}

function BookingConfirmation({ appointment, fallbackDoctor, headingRef, onBookAnother, onClose }) {
  const doctor = appointment.doctor && typeof appointment.doctor === 'object' ? appointment.doctor : fallbackDoctor;
  const rows = [
    ['Doctor', doctor?.name || 'Not listed'],
    ['Department', doctor?.specialization || 'Not listed'],
    ['Date', formatDate(appointment.date)],
    ['Time', formatTime(appointment.time)],
    ['Fee', formatFee(doctor?.fees)],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-confirmed-soft text-confirmed-ink">
          <CalendarCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 ref={headingRef} tabIndex={-1} className="mt-5 text-3xl font-extrabold tracking-tight focus:outline-none">
          Appointment booked
        </h3>
        <p className="mt-2 text-ink-soft">
          It shows as pending until the clinic confirms it. You can follow its status under My appointments.
        </p>
        <dl className="mt-6 divide-y divide-line rounded-plate border border-line">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="text-right font-semibold text-ink">{value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-ink-muted">Status</dt>
            <dd>
              <StatusBadge status={appointment.status || 'pending'} />
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-line bg-surface-muted px-5 py-4 sm:px-6">
        <Button variant="secondary" onClick={onBookAnother} className="flex-1">
          Book another
        </Button>
        <Button onClick={onClose} className="flex-1">
          Done
        </Button>
      </div>
    </div>
  );
}

/**
 * Four-step booking form: doctor, date, time, reason. Lives inside a drawer, so
 * it renders its own scrolling body and a footer that stays in view.
 */
export default function AppointmentForm({
  doctors = [],
  doctorsLoading = false,
  doctorsError = '',
  onRetryDoctors,
  initialDoctorId = '',
  onBooked,
  onClose,
}) {
  const uid = useId();
  const ids = {
    doctor: `${uid}doctor`,
    date: `${uid}date`,
    otherDate: `${uid}other-date`,
    time: `${uid}time`,
    reason: `${uid}reason`,
  };

  const [doctorId, setDoctorId] = useState(initialDoctorId || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);

  const doctorRef = useRef(null);
  const dateGroupRef = useRef(null);
  const timeGroupRef = useRef(null);
  const successRef = useRef(null);

  const days = useMemo(() => upcomingDays(), []);
  const minDate = useMemo(() => earliestBookableKey(), []);
  const sortedDoctors = useMemo(
    () => [...doctors].sort((a, b) => sortableName(a.name).localeCompare(sortableName(b.name))),
    [doctors]
  );
  const doctor = doctors.find((item) => item._id === doctorId);

  // Drop a preselected doctor that is no longer in the directory.
  useEffect(() => {
    if (!doctorsLoading && doctorId && doctors.length > 0 && !doctors.some((item) => item._id === doctorId)) {
      setDoctorId('');
    }
  }, [doctors, doctorsLoading, doctorId]);

  useEffect(() => {
    if (booked) successRef.current?.focus();
  }, [booked]);

  function clearError(key) {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function focusFirstInvalid(nextErrors) {
    if (nextErrors.doctor) {
      doctorRef.current?.focus();
      return;
    }
    let group = null;
    if (nextErrors.date) group = dateGroupRef.current;
    else if (nextErrors.time) group = timeGroupRef.current;
    const target = group?.querySelector('input:checked') || group?.querySelector('input');
    target?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const nextErrors = {};
    if (!doctorId) nextErrors.doctor = 'Choose a doctor.';
    if (!date) nextErrors.date = 'Choose a date.';
    else if (date < minDate) nextErrors.date = 'Choose a date from tomorrow onwards.';
    if (!time) nextErrors.time = 'Choose a time.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await appointmentAPI.create({ doctorId, date, time, reason: reason.trim() });
      if (response.data.success) {
        const appointment = response.data.appointment || { doctor, date, time, reason, status: 'pending' };
        setBooked(appointment);
        onBooked?.(appointment);
      } else {
        setSubmitError(response.data.message || 'The appointment could not be booked.');
      }
    } catch (err) {
      const message = err.response?.data?.message;
      if (message && /already booked/i.test(message)) {
        setSubmitError('That time is already taken with this doctor. Choose another time or date.');
      } else {
        setSubmitError(message || 'The appointment could not be booked. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function bookAnother() {
    setBooked(null);
    setDate('');
    setTime('');
    setReason('');
    setErrors({});
  }

  if (booked) {
    return (
      <BookingConfirmation
        appointment={booked}
        fallbackDoctor={doctor}
        headingRef={successRef}
        onBookAnother={bookAnother}
        onClose={onClose}
      />
    );
  }

  const complete = Boolean(doctor && date && time);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-6">
        <div>
          <StepLabel as="label" number={1} htmlFor={ids.doctor}>
            Doctor
          </StepLabel>
          <div className="mt-3">
            {doctorsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : doctorsError ? (
              <Alert
                action={
                  onRetryDoctors ? (
                    <Button variant="secondary" size="sm" onClick={onRetryDoctors}>
                      <RefreshCw aria-hidden="true" />
                      Try again
                    </Button>
                  ) : null
                }
              >
                {doctorsError}
              </Alert>
            ) : (
              <Select
                ref={doctorRef}
                id={ids.doctor}
                value={doctorId}
                invalid={Boolean(errors.doctor)}
                aria-describedby={errors.doctor ? `${ids.doctor}-error` : undefined}
                onChange={(event) => {
                  setDoctorId(event.target.value);
                  clearError('doctor');
                }}
              >
                <option value="">Choose a doctor</option>
                {sortedDoctors.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.specialization})
                  </option>
                ))}
              </Select>
            )}
            {!doctorsLoading && !doctorsError && doctors.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">No doctors are listed yet.</p>
            ) : null}
            <FieldError id={`${ids.doctor}-error`}>{errors.doctor}</FieldError>
            {doctor ? <SelectedDoctor doctor={doctor} /> : null}
          </div>
        </div>

        <fieldset ref={dateGroupRef} aria-describedby={errors.date ? `${ids.date}-error` : undefined}>
          <legend>
            <StepLabel number={2}>Date</StepLabel>
          </legend>
          <div className="-mx-5 mt-3 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <div className="flex w-max gap-2 py-1">
              {days.map((day) => {
                const key = toDateKey(day);
                return (
                  <label key={key} className="relative block">
                    <input
                      type="radio"
                      name={`${uid}date-choice`}
                      value={key}
                      checked={date === key}
                      onChange={() => {
                        setDate(key);
                        clearError('date');
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        'flex h-[4.75rem] w-[4.25rem] flex-col items-center justify-center text-center',
                        choiceClass
                      )}
                    >
                      <span className="text-xs font-semibold opacity-75">{format(day, 'EEE')}</span>
                      <span className="tabular text-2xl font-extrabold leading-tight">{format(day, 'd')}</span>
                      <span className="text-xs font-semibold opacity-75">{format(day, 'MMM')}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <label htmlFor={ids.otherDate} className="text-sm font-semibold text-ink-soft">
              Or choose a later date
            </label>
            <Input
              id={ids.otherDate}
              type="date"
              size="sm"
              fullWidth={false}
              min={minDate}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                clearError('date');
              }}
            />
          </div>
          <FieldError id={`${ids.date}-error`}>{errors.date}</FieldError>
        </fieldset>

        <fieldset ref={timeGroupRef} aria-describedby={errors.time ? `${ids.time}-error` : undefined}>
          <legend>
            <StepLabel number={3}>Time</StepLabel>
          </legend>
          <div className="mt-3 space-y-4">
            {SLOT_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="mb-2 text-sm font-semibold text-ink-muted">{group.label}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {group.slots.map((slot) => (
                    <label key={slot} className="relative block">
                      <input
                        type="radio"
                        name={`${uid}time-choice`}
                        value={slot}
                        checked={time === slot}
                        onChange={() => {
                          setTime(slot);
                          clearError('time');
                        }}
                        className="peer sr-only"
                      />
                      <span className={cn('tabular flex h-11 items-center justify-center text-[15px] font-semibold', choiceClass)}>
                        {formatTime(slot)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <FieldError id={`${ids.time}-error`}>{errors.time}</FieldError>
        </fieldset>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <StepLabel as="label" number={4} htmlFor={ids.reason}>
              Reason for visit
            </StepLabel>
            <span className="text-sm text-ink-muted">Optional</span>
          </div>
          <Textarea
            id={ids.reason}
            className="mt-3"
            rows={4}
            value={reason}
            maxLength={REASON_LIMIT}
            placeholder="For example: a follow-up on blood pressure, or a rash that started last week"
            aria-describedby={`${ids.reason}-count`}
            onChange={(event) => setReason(event.target.value)}
          />
          <p id={`${ids.reason}-count`} className="tabular mt-1.5 text-right text-sm text-ink-muted">
            {reason.length} of {REASON_LIMIT} characters
          </p>
        </div>
      </div>

      <div className="shrink-0 space-y-3 border-t border-line bg-surface-muted px-5 py-4 sm:px-6">
        {submitError ? <Alert>{submitError}</Alert> : null}
        <p className="text-[15px] text-ink-soft">
          {complete ? (
            <>
              <span className="font-semibold text-ink">
                {formatDate(date, 'EEE d MMM')} at {formatTime(time)}
              </span>{' '}
              <span className="text-ink-muted">
                with {doctor.name}, {formatFee(doctor.fees)}
              </span>
            </>
          ) : (
            'Choose a doctor, a date and a time.'
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">
            Close
          </Button>
          <Button type="submit" loading={submitting} loadingText="Booking" className="flex-1">
            Book appointment
          </Button>
        </div>
      </div>
    </form>
  );
}
