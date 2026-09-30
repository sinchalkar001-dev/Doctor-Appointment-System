import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import { appointmentAPI, doctorAPI } from '../api';
import { useLiveEvent } from './LiveProvider';
import Alert from './ui/Alert';
import Button from './ui/Button';
import DepartmentTile from './ui/DepartmentTile';
import Skeleton from './ui/Skeleton';
import StatusBadge from './ui/StatusBadge';
import { FieldError, Input, Select, Textarea } from './ui/Field';
import { cn } from '../lib/cn';
import { formatDate, formatFee, formatTime, pluralize, sortableName, toDateKey } from '../lib/format';
import { describeAvailability, groupSlots, lastBookableKey, todayKey, upcomingDays } from '../lib/schedule';

const REASON_LIMIT = 500;

const choiceClass =
  'cursor-pointer rounded-control border border-line-strong bg-surface text-ink transition-colors hover:border-ink-muted peer-checked:border-action peer-checked:bg-action peer-checked:text-ink-inverse peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-disabled:cursor-not-allowed peer-disabled:border-dashed peer-disabled:bg-surface-muted peer-disabled:text-ink-muted peer-disabled:hover:border-line-strong';

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
        {doctor.availability ? (
          <p className="truncate text-sm text-ink-muted">{describeAvailability(doctor.availability)}</p>
        ) : null}
      </div>
      <p className="shrink-0 text-right leading-tight">
        <span className="block text-xs text-ink-muted">Fee</span>
        <span className="tabular font-bold text-ink">{formatFee(doctor.fees)}</span>
      </p>
    </div>
  );
}

function Confirmation({ appointment, fallbackDoctor, rescheduled, headingRef, onBookAnother, onClose }) {
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
          {rescheduled ? 'Appointment moved' : 'Appointment booked'}
        </h3>
        <p className="mt-2 text-ink-soft">
          {rescheduled
            ? 'The new time is pending until the doctor confirms it. You’ll see the change here as soon as they do.'
            : 'It stays pending until the doctor confirms it. You’ll see the change here as soon as they do.'}
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
        {!rescheduled ? (
          <Button variant="secondary" onClick={onBookAnother} className="flex-1">
            Book another
          </Button>
        ) : null}
        <Button onClick={onClose} className="flex-1">
          Done
        </Button>
      </div>
    </div>
  );
}

function slotMessage(slotsState, date) {
  if (!slotsState.workingDay) {
    return `The doctor doesn’t see patients on ${formatDate(date, 'EEEE')}s. Choose another date.`;
  }
  if (slotsState.list.length === 0) return 'No times are left on this day. Choose another date.';
  return 'Every time on this day is booked. Choose another date.';
}

/**
 * Booking form with live availability: days off and full days are disabled,
 * booked times are shown but can't be picked, and the lists refresh the moment
 * someone else books. Pass `appointment` to reschedule it instead of booking.
 */
export default function AppointmentForm({
  doctors = [],
  doctorsLoading = false,
  doctorsError = '',
  onRetryDoctors,
  initialDoctorId = '',
  appointment = null,
  onBooked,
  onClose,
}) {
  const rescheduling = Boolean(appointment);
  const uid = useId();
  const ids = {
    doctor: `${uid}doctor`,
    date: `${uid}date`,
    otherDate: `${uid}other-date`,
    time: `${uid}time`,
    reason: `${uid}reason`,
  };

  const [doctorId, setDoctorId] = useState(
    rescheduling ? String(appointment.doctor?._id || appointment.doctor || '') : initialDoctorId || ''
  );
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [calendar, setCalendar] = useState({ loading: false, days: new Map() });
  const [slots, setSlots] = useState({ loading: false, error: '', list: [], workingDay: true, date: '' });

  const doctorRef = useRef(null);
  const dateGroupRef = useRef(null);
  const timeGroupRef = useRef(null);
  const successRef = useRef(null);
  const calendarRequest = useRef(0);
  const slotsRequest = useRef(0);
  const timeRef = useRef(time);
  timeRef.current = time;

  const days = useMemo(() => upcomingDays(), []);
  const firstDay = useMemo(() => todayKey(), []);
  const lastDay = useMemo(() => lastBookableKey(), []);
  const sortedDoctors = useMemo(
    () => [...doctors].sort((a, b) => sortableName(a.name).localeCompare(sortableName(b.name))),
    [doctors]
  );
  const doctor = rescheduling
    ? appointment.doctor
    : doctors.find((item) => item._id === doctorId);

  // Drop a preselected doctor that is no longer in the directory.
  useEffect(() => {
    if (rescheduling) return;
    if (!doctorsLoading && doctorId && doctors.length > 0 && !doctors.some((item) => item._id === doctorId)) {
      setDoctorId('');
    }
  }, [doctors, doctorsLoading, doctorId, rescheduling]);

  const loadCalendar = useCallback(async (id) => {
    calendarRequest.current += 1;
    const request = calendarRequest.current;
    if (!id) {
      setCalendar({ loading: false, days: new Map() });
      return;
    }
    setCalendar((current) => ({ ...current, loading: current.days.size === 0 }));
    try {
      const response = await doctorAPI.getCalendar(id, { from: todayKey(), days: days.length });
      if (request !== calendarRequest.current) return;
      setCalendar({ loading: false, days: new Map(response.data.days.map((day) => [day.date, day])) });
    } catch {
      if (request !== calendarRequest.current) return;
      setCalendar({ loading: false, days: new Map() });
    }
  }, [days.length]);

  const loadSlots = useCallback(async (id, dateKey, { silent = false } = {}) => {
    slotsRequest.current += 1;
    const request = slotsRequest.current;
    if (!id || !dateKey) {
      setSlots({ loading: false, error: '', list: [], workingDay: true, date: '' });
      return;
    }
    if (!silent) setSlots((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await doctorAPI.getSlots(id, dateKey);
      if (request !== slotsRequest.current) return;
      const list = response.data.slots || [];
      setSlots({ loading: false, error: '', list, workingDay: response.data.workingDay, date: dateKey });
      const chosen = timeRef.current;
      if (chosen && !list.some((slot) => slot.time === chosen && slot.status === 'open')) {
        setTime('');
        setNotice('The time you picked was just booked by someone else. Choose another time.');
      }
    } catch (err) {
      if (request !== slotsRequest.current) return;
      setSlots({
        loading: false,
        error: err.response?.data?.message || 'Open times could not be loaded.',
        list: [],
        workingDay: true,
        date: dateKey,
      });
    }
  }, []);

  useEffect(() => {
    loadCalendar(doctorId);
  }, [doctorId, loadCalendar]);

  useEffect(() => {
    loadSlots(doctorId, date);
  }, [doctorId, date, loadSlots]);

  // Someone booked, moved or cancelled with this doctor: refresh what's open.
  useLiveEvent('slots', (event) => {
    if (!event || String(event.doctorId) !== String(doctorId)) return;
    loadCalendar(doctorId);
    if (date && (!event.date || event.date === date)) loadSlots(doctorId, date, { silent: true });
  });

  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  function clearError(key) {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function chooseDoctor(id) {
    setDoctorId(id);
    setDate('');
    setTime('');
    setNotice('');
    clearError('doctor');
  }

  function chooseDate(key) {
    setDate(key);
    setTime('');
    setNotice('');
    clearError('date');
  }

  function focusFirstInvalid(nextErrors) {
    if (nextErrors.doctor) {
      doctorRef.current?.focus();
      return;
    }
    let group = null;
    if (nextErrors.date) group = dateGroupRef.current;
    else if (nextErrors.time) group = timeGroupRef.current;
    const target = group?.querySelector('input:checked') || group?.querySelector('input:not(:disabled)');
    target?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const nextErrors = {};
    if (!doctorId) nextErrors.doctor = 'Choose a doctor.';
    if (!date) nextErrors.date = 'Choose a date.';
    if (!time) nextErrors.time = 'Choose a time.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = rescheduling
        ? await appointmentAPI.reschedule(appointment._id, { date, time })
        : await appointmentAPI.create({ doctorId, date, time, reason: reason.trim() });
      if (response.data.success) {
        const saved = response.data.appointment || { doctor, date, time, reason, status: 'pending' };
        setDone(saved);
        onBooked?.(saved);
      } else {
        setSubmitError(response.data.message || 'The appointment could not be saved.');
      }
    } catch (err) {
      const status = err.response?.status;
      setSubmitError(err.response?.data?.message || 'The appointment could not be saved. Check your connection and try again.');
      if (status === 409 || status === 400) {
        setTime('');
        loadSlots(doctorId, date, { silent: true });
        loadCalendar(doctorId);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function bookAnother() {
    setDone(null);
    setDate('');
    setTime('');
    setReason('');
    setErrors({});
    setNotice('');
    loadCalendar(doctorId);
  }

  if (done) {
    return (
      <Confirmation
        appointment={done}
        fallbackDoctor={doctor}
        rescheduled={rescheduling}
        headingRef={successRef}
        onBookAnother={bookAnother}
        onClose={onClose}
      />
    );
  }

  const visibleSlots = slots.list.filter((slot) => slot.status !== 'past');
  const openCount = visibleSlots.filter((slot) => slot.status === 'open').length;
  const complete = Boolean(doctor && date && time);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-6">
        <div>
          {rescheduling ? (
            <>
              <StepLabel number={1}>Doctor</StepLabel>
              <p className="mt-2 text-[15px] text-ink-muted">
                Currently {formatDate(appointment.date, 'EEEE d MMMM')} at {formatTime(appointment.time)}. Pick a new time below.
              </p>
            </>
          ) : (
            <StepLabel as="label" number={1} htmlFor={ids.doctor}>
              Doctor
            </StepLabel>
          )}
          <div className="mt-3">
            {rescheduling ? null : doctorsLoading ? (
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
                onChange={(event) => chooseDoctor(event.target.value)}
              >
                <option value="">Choose a doctor</option>
                {sortedDoctors.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.specialization})
                  </option>
                ))}
              </Select>
            )}
            {!rescheduling && !doctorsLoading && !doctorsError && doctors.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">No doctors are listed yet.</p>
            ) : null}
            <FieldError id={`${ids.doctor}-error`}>{errors.doctor}</FieldError>
            {doctor ? <SelectedDoctor doctor={doctor} /> : null}
          </div>
        </div>

        <fieldset
          ref={dateGroupRef}
          disabled={!doctorId}
          aria-describedby={errors.date ? `${ids.date}-error` : `${ids.date}-hint`}
        >
          <legend>
            <StepLabel number={2}>Date</StepLabel>
          </legend>
          <p id={`${ids.date}-hint`} className="mt-2 text-sm text-ink-muted">
            {doctorId ? 'Days off and fully booked days can’t be picked.' : 'Choose a doctor to see which days are open.'}
          </p>
          <div className="-mx-5 mt-3 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <div className="flex w-max gap-2 py-1">
              {days.map((day, index) => {
                const key = toDateKey(day);
                const info = calendar.days.get(key);
                const off = Boolean(info && !info.workingDay);
                const full = Boolean(info && info.workingDay && info.openCount === 0);
                let note = '';
                if (doctorId && info) {
                  if (off) note = 'Off';
                  else if (full) note = index === 0 ? 'Closed' : 'Full';
                  else note = `${info.openCount} open`;
                }
                return (
                  <label key={key} className="relative block">
                    <input
                      type="radio"
                      name={`${uid}date-choice`}
                      value={key}
                      checked={date === key}
                      disabled={!doctorId || off || full}
                      onChange={() => chooseDate(key)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        'flex h-[5.25rem] w-[4.5rem] flex-col items-center justify-center text-center',
                        choiceClass
                      )}
                    >
                      <span className="text-xs font-semibold opacity-80">{index === 0 ? 'Today' : format(day, 'EEE')}</span>
                      <span className="tabular text-2xl font-extrabold leading-tight">{format(day, 'd')}</span>
                      <span className="text-xs font-semibold opacity-80">
                        {calendar.loading && doctorId ? format(day, 'MMM') : note || format(day, 'MMM')}
                      </span>
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
              min={firstDay}
              max={lastDay}
              value={date}
              onChange={(event) => chooseDate(event.target.value)}
            />
          </div>
          <FieldError id={`${ids.date}-error`}>{errors.date}</FieldError>
        </fieldset>

        <fieldset ref={timeGroupRef} aria-describedby={errors.time ? `${ids.time}-error` : undefined}>
          <legend>
            <StepLabel number={3}>Time</StepLabel>
          </legend>

          {notice ? (
            <Alert tone="warning" className="mt-3">
              {notice}
            </Alert>
          ) : null}

          {!date ? (
            <p className="mt-2 text-sm text-ink-muted">Pick a date to see the doctor’s open times.</p>
          ) : slots.loading ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-11 rounded-control" />
              ))}
            </div>
          ) : slots.error ? (
            <Alert
              className="mt-3"
              action={
                <Button variant="secondary" size="sm" onClick={() => loadSlots(doctorId, date)}>
                  <RefreshCw aria-hidden="true" />
                  Try again
                </Button>
              }
            >
              {slots.error}
            </Alert>
          ) : openCount === 0 ? (
            <p className="mt-3 rounded-control border border-dashed border-line-strong bg-surface-muted px-4 py-3 text-[15px] text-ink-soft">
              {slotMessage({ ...slots, list: visibleSlots }, date)}
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <p className="text-sm text-ink-muted">
                {pluralize(openCount, 'open time')} on {formatDate(date, 'EEEE d MMMM')}. Taken times are crossed out.
              </p>
              {groupSlots(visibleSlots).map((group) => (
                <div key={group.id}>
                  <p className="mb-2 text-sm font-semibold text-ink-muted">{group.label}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {group.slots.map((slot) => {
                      const current =
                        rescheduling && date === appointment.date && slot.time === appointment.time;
                      const unavailable = slot.status !== 'open';
                      return (
                        <label key={slot.time} className="relative block">
                          <input
                            type="radio"
                            name={`${uid}time-choice`}
                            value={slot.time}
                            checked={time === slot.time}
                            disabled={unavailable}
                            onChange={() => {
                              setTime(slot.time);
                              setNotice('');
                              clearError('time');
                            }}
                            className="peer sr-only"
                          />
                          <span
                            className={cn(
                              'tabular flex h-11 items-center justify-center text-[15px] font-semibold',
                              choiceClass,
                              unavailable && !current && 'line-through'
                            )}
                          >
                            {formatTime(slot.time)}
                            {current ? <span className="sr-only"> (your current time)</span> : null}
                            {unavailable && !current ? <span className="sr-only"> (taken)</span> : null}
                          </span>
                          {current ? (
                            <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-chip bg-sign px-1.5 text-[11px] font-bold leading-4 text-ink-inverse">
                              Current
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <FieldError id={`${ids.time}-error`}>{errors.time}</FieldError>
        </fieldset>

        {!rescheduling ? (
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
        ) : null}
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
          ) : rescheduling ? (
            'Choose a new date and time.'
          ) : (
            'Choose a doctor, a date and a time.'
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">
            Close
          </Button>
          <Button type="submit" loading={submitting} loadingText="Saving" className="flex-1">
            {rescheduling ? 'Move appointment' : 'Book appointment'}
          </Button>
        </div>
      </div>
    </form>
  );
}
