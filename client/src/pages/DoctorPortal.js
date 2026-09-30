import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarX, Check, CheckCheck, Clock, Inbox, Mail, Phone, RefreshCw, Settings, Signpost } from 'lucide-react';
import { doctorPortalAPI } from '../api';
import AvailabilityEditor from '../components/AvailabilityEditor';
import { DateBlock } from '../components/AppointmentItem';
import { LiveStatus, useLiveEvent } from '../components/LiveProvider';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import DepartmentTile from '../components/ui/DepartmentTile';
import Dialog from '../components/ui/Dialog';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import StatusBadge from '../components/ui/StatusBadge';
import { TabList, TabPanel } from '../components/ui/Tabs';
import { Textarea } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { cn } from '../lib/cn';
import { formatDate, formatFee, formatTime, greeting, pluralize, toDateTime } from '../lib/format';
import { DEFAULT_AVAILABILITY, availabilityProblems, describeAvailability, todayKey } from '../lib/schedule';

const TABS = [
  { id: 'requests', label: 'Requests' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

const EMPTY = {
  requests: { icon: Inbox, title: 'No requests waiting', description: 'New bookings appear here the moment a patient makes them.' },
  upcoming: { icon: CalendarCheck, title: 'Nothing confirmed yet', description: 'Appointments you confirm are listed here in date order.' },
  past: { icon: CheckCheck, title: 'No past visits', description: 'Visits move here once their time has passed.' },
  cancelled: { icon: CalendarX, title: 'Nothing cancelled', description: 'Declined and cancelled appointments stay here for reference.' },
};

const ACTION_COPY = {
  decline: {
    title: 'Decline this request?',
    confirm: 'Decline request',
    tone: 'danger',
    field: 'Reason for the patient',
    placeholder: 'For example: I’m away that day. Please book with Dr. Taylor instead.',
    status: 'cancelled',
    toast: 'Request declined',
  },
  cancel: {
    title: 'Cancel this appointment?',
    confirm: 'Cancel appointment',
    tone: 'danger',
    field: 'Reason for the patient',
    placeholder: 'For example: The clinic is closed for maintenance.',
    status: 'cancelled',
    toast: 'Appointment cancelled',
  },
  complete: {
    title: 'Mark this visit completed?',
    confirm: 'Mark completed',
    tone: 'primary',
    field: 'Note for the patient',
    placeholder: 'For example: Blood work normal. Recheck in six months.',
    status: 'completed',
    toast: 'Visit marked completed',
  },
};

function doctorName(name = '') {
  const parts = name.replace(/^dr\.?\s+/i, '').trim().split(/\s+/);
  return parts.length ? `Dr. ${parts[parts.length - 1]}` : 'Doctor';
}

function started(appointment, now = new Date()) {
  const at = toDateTime(appointment.date, appointment.time);
  return Boolean(at && at <= now);
}

function ActionDialog({ action, busy, onClose, onConfirm }) {
  const [text, setText] = useState('');
  const copy = action ? ACTION_COPY[action.type] : null;

  useEffect(() => {
    setText('');
  }, [action]);

  if (!action) return null;
  const { appointment } = action;
  const patient = appointment.user?.name || 'The patient';

  return (
    <Dialog
      open
      onClose={onClose}
      role="alertdialog"
      size="sm"
      dismissible={!busy}
      title={copy.title}
      description={`${patient}, ${formatDate(appointment.date, 'EEEE d MMMM')} at ${formatTime(appointment.time)}. They’ll see this change straight away.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Go back
          </Button>
          <Button variant={copy.tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={() => onConfirm(text.trim())}>
            {copy.confirm}
          </Button>
        </>
      }
    >
      <label htmlFor="doctor-action-text" className="flex items-baseline justify-between text-[15px] font-semibold text-ink">
        {copy.field}
        <span className="text-sm font-normal text-ink-muted">Optional</span>
      </label>
      <Textarea
        id="doctor-action-text"
        className="mt-2"
        rows={3}
        maxLength={copy.status === 'completed' ? 1000 : 300}
        placeholder={copy.placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </Dialog>
  );
}

function AppointmentRow({ appointment, busyId, onConfirm, onAction }) {
  const { user: patient, status } = appointment;
  const busy = busyId === appointment._id;
  const locked = Boolean(busyId) && !busy;
  const hasStarted = started(appointment);

  const buttons = [];
  if (status === 'pending' && !hasStarted) {
    buttons.push(
      <Button key="confirm" size="sm" loading={busy} disabled={locked} onClick={() => onConfirm(appointment)}>
        <Check aria-hidden="true" />
        Confirm
      </Button>
    );
  }
  if (status === 'confirmed' && hasStarted) {
    buttons.push(
      <Button key="complete" size="sm" disabled={locked || busy} onClick={() => onAction('complete', appointment)}>
        <CheckCheck aria-hidden="true" />
        Mark completed
      </Button>
    );
  }
  if (status === 'pending') {
    buttons.push(
      <Button key="decline" variant="danger-ghost" size="sm" disabled={locked || busy} onClick={() => onAction('decline', appointment)}>
        Decline
      </Button>
    );
  }
  if (status === 'confirmed') {
    buttons.push(
      <Button key="cancel" variant="danger-ghost" size="sm" disabled={locked || busy} onClick={() => onAction('cancel', appointment)}>
        Cancel
      </Button>
    );
  }

  return (
    <li className="plate flex gap-4 p-4 sm:gap-5 sm:p-5">
      <DateBlock value={appointment.date} muted={status === 'cancelled'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="text-lg font-bold leading-snug">{patient?.name || 'Patient account removed'}</h3>
          <StatusBadge status={status} />
          {status === 'pending' && hasStarted ? (
            <span className="text-sm font-semibold text-pending-ink">Not confirmed in time</span>
          ) : null}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            {formatTime(appointment.time)}
          </span>
          {patient?.email ? (
            <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-ink hover:underline">
              <Mail className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              {patient.email}
            </a>
          ) : null}
          {patient?.phone ? (
            <a href={`tel:${patient.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-ink hover:underline">
              <Phone className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              {patient.phone}
            </a>
          ) : null}
        </p>
        {appointment.reason ? (
          <p className="mt-2 text-[15px] text-ink-muted">
            <span className="font-semibold text-ink-soft">Reason: </span>
            {appointment.reason}
          </p>
        ) : null}
        {appointment.doctorNote ? (
          <p className="mt-2 text-[15px] text-ink-muted">
            <span className="font-semibold text-ink-soft">Your note: </span>
            {appointment.doctorNote}
          </p>
        ) : null}
        {status === 'cancelled' ? (
          <p className="mt-2 text-[15px] text-ink-muted">
            {{ patient: 'Cancelled by the patient.', doctor: 'You cancelled this.', admin: 'Cancelled by the clinic.' }[appointment.cancelledBy] ||
              'Cancelled.'}
            {appointment.cancelReason ? ` ${appointment.cancelReason}` : ''}
          </p>
        ) : null}
        {buttons.length ? <div className="mt-3 flex flex-wrap gap-2">{buttons}</div> : null}
      </div>
    </li>
  );
}

export default function DoctorPortal({ user }) {
  useDocumentTitle('Schedule');
  const { notify } = useToast();

  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('requests');
  const [busyId, setBusyId] = useState(null);
  const [action, setAction] = useState(null);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hours, setHours] = useState(DEFAULT_AVAILABILITY);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursError, setHoursError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [me, list] = await Promise.all([doctorPortalAPI.me(), doctorPortalAPI.appointments()]);
      setProfile(me.data.doctor);
      setAppointments(list.data.appointments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Your schedule could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveEvent('appointment', () => load({ silent: true }));
  useLiveEvent('reconnected', () => load({ silent: true }));

  const groups = useMemo(() => {
    const now = new Date();
    const stamp = (item) => toDateTime(item.date, item.time)?.getTime() || 0;
    const byTime = (a, b) => stamp(a) - stamp(b);
    const today = todayKey();
    return {
      today: appointments.filter((item) => item.date === today && item.status !== 'cancelled').sort(byTime),
      requests: appointments.filter((item) => item.status === 'pending' && !started(item, now)).sort(byTime),
      upcoming: appointments.filter((item) => item.status === 'confirmed' && !started(item, now)).sort(byTime),
      past: appointments
        .filter((item) => item.status === 'completed' || (['pending', 'confirmed'].includes(item.status) && started(item, now)))
        .sort((a, b) => byTime(b, a)),
      cancelled: appointments.filter((item) => item.status === 'cancelled').sort((a, b) => byTime(b, a)),
    };
  }, [appointments]);

  const toComplete = groups.past.filter((item) => item.status === 'confirmed').length;
  const nextItem = [...groups.requests, ...groups.upcoming].sort(
    (a, b) => (toDateTime(a.date, a.time)?.getTime() || 0) - (toDateTime(b.date, b.time)?.getTime() || 0)
  )[0];

  const applyUpdate = async (appointment, status, extra = {}) => {
    setBusyId(appointment._id);
    try {
      const response = await doctorPortalAPI.updateAppointment(appointment._id, { status, ...extra });
      const updated = response.data.appointment;
      setAppointments((current) => current.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)));
      return updated;
    } catch (err) {
      notify({ tone: 'error', title: 'The appointment wasn’t updated', description: err.response?.data?.message || 'Try again in a moment.' });
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const confirm = async (appointment) => {
    const updated = await applyUpdate(appointment, 'confirmed');
    if (updated) {
      notify({
        title: 'Appointment confirmed',
        description: `${appointment.user?.name || 'Patient'}, ${formatDate(appointment.date, 'EEE d MMM')} at ${formatTime(appointment.time)}`,
      });
    }
  };

  const runAction = async (text) => {
    if (!action) return;
    const copy = ACTION_COPY[action.type];
    const extra = copy.status === 'completed' ? { note: text } : { reason: text };
    const updated = await applyUpdate(action.appointment, copy.status, extra);
    if (updated) {
      notify({ title: copy.toast, description: action.appointment.user?.name });
      setAction(null);
    }
  };

  const openHours = () => {
    setHours({ ...DEFAULT_AVAILABILITY, ...(profile?.availability || {}) });
    setHoursError('');
    setHoursOpen(true);
  };

  const saveHours = async () => {
    const problems = availabilityProblems(hours);
    if (problems.length) {
      setHoursError(problems[0]);
      return;
    }
    setSavingHours(true);
    setHoursError('');
    try {
      const response = await doctorPortalAPI.saveAvailability(hours);
      setProfile((current) => ({ ...current, availability: response.data.availability }));
      notify({ title: 'Working hours saved', description: 'Patients now see your new open times.' });
      setHoursOpen(false);
    } catch (err) {
      setHoursError(err.response?.data?.message || 'Your working hours could not be saved.');
    } finally {
      setSavingHours(false);
    }
  };

  let summary = 'Loading your schedule…';
  if (error) summary = 'Your schedule is unavailable right now.';
  else if (!loading) {
    const parts = [
      groups.today.length ? `${pluralize(groups.today.length, 'appointment')} today.` : 'No appointments today.',
    ];
    if (groups.requests.length) parts.push(`${pluralize(groups.requests.length, 'request')} waiting for you.`);
    if (toComplete) parts.push(`${pluralize(toComplete, 'visit')} to mark completed.`);
    summary = parts.join(' ');
  }

  const items = groups[tab];
  let list;
  if (loading) {
    list = (
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="plate flex gap-4 p-5">
            <Skeleton className="h-[4.5rem] w-16 rounded-lg" />
            <div className="flex-1 space-y-2.5 pt-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (error) {
    list = (
      <Alert
        title="Your schedule didn’t load"
        action={
          <Button variant="secondary" size="sm" onClick={() => load()}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        }
      >
        {error}
      </Alert>
    );
  } else if (items.length === 0) {
    const empty = EMPTY[tab];
    list = <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />;
  } else {
    list = (
      <ul className="space-y-3">
        {items.map((appointment) => (
          <AppointmentRow
            key={appointment._id}
            appointment={appointment}
            busyId={busyId}
            onConfirm={confirm}
            onAction={(type, item) => setAction({ type, appointment: item })}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <LiveStatus />
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {greeting()}, {doctorName(profile?.name || user?.name)}
          </h1>
          <p className="mt-3 text-lg text-ink-soft" aria-live="polite">
            {summary}
          </p>
        </div>
        <Button variant="secondary" size="lg" onClick={openHours} disabled={!profile}>
          <Settings aria-hidden="true" />
          Working hours
        </Button>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="today-title" className="on-sign overflow-hidden rounded-plate bg-sign text-ink-inverse">
            <div className="flex items-center justify-between gap-3 border-b border-sign-line px-5 py-3 sm:px-6">
              <h2 id="today-title" className="flex items-center gap-2 text-base font-bold text-ink-inverse">
                <Signpost className="h-5 w-5 text-signal" aria-hidden="true" />
                Today
              </h2>
              <span className="text-sm font-semibold text-signal">{formatDate(todayKey(), 'EEEE d MMMM')}</span>
            </div>
            {loading ? (
              <div className="h-28 animate-pulse bg-sign-raised/40" aria-hidden="true" />
            ) : groups.today.length === 0 ? (
              <p className="px-5 py-6 text-sign-muted sm:px-6">
                No appointments today.{' '}
                {nextItem
                  ? `Next: ${formatDate(nextItem.date, 'EEE d MMM')} at ${formatTime(nextItem.time)} with ${
                      nextItem.user?.name || 'a patient'
                    }${nextItem.status === 'pending' ? ', waiting for you to confirm' : ''}.`
                  : ''}
              </p>
            ) : (
              <ol className="divide-y divide-sign-line">
                {groups.today.map((appointment) => (
                  <li key={appointment._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 sm:px-6">
                    <span className="tabular w-24 text-2xl font-extrabold">{formatTime(appointment.time)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-semibold">{appointment.user?.name || 'Patient'}</span>
                      {appointment.reason ? (
                        <span className="block truncate text-sm text-sign-muted">{appointment.reason}</span>
                      ) : null}
                    </span>
                    <StatusBadge status={appointment.status} />
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="doctor-appointments-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="doctor-appointments-title" className="text-2xl font-bold">
                Appointments
              </h2>
              <TabList
                variant="segmented"
                label="Filter appointments"
                idPrefix="doctor-appointments"
                tabs={TABS.map((item) => ({ ...item, count: loading ? undefined : groups[item.id].length }))}
                value={tab}
                onChange={setTab}
              />
            </div>
            <TabPanel idPrefix="doctor-appointments" value={tab} className="mt-5">
              {list}
            </TabPanel>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section aria-labelledby="hours-title" className="plate p-5">
            <h2 id="hours-title" className="text-lg font-bold">
              Working hours
            </h2>
            {profile ? (
              <>
                <p className="mt-2 text-[15px] text-ink-soft">{describeAvailability(profile.availability)}</p>
                <p className="mt-1 text-[15px] text-ink-muted">
                  {profile.availability?.slotMinutes || 30}-minute appointments
                  {profile.availability?.breakStart
                    ? `, break ${formatTime(profile.availability.breakStart)} to ${formatTime(profile.availability.breakEnd)}`
                    : ', no break'}
                  .
                </p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={openHours}>
                  Change hours
                </Button>
              </>
            ) : (
              <Skeleton className="mt-3 h-12 w-full" />
            )}
          </section>

          {profile ? (
            <section aria-labelledby="profile-title" className="plate p-5">
              <h2 id="profile-title" className="text-lg font-bold">
                Directory listing
              </h2>
              <p className="mt-3 flex items-center gap-2.5 font-semibold text-ink">
                <DepartmentTile department={profile.specialization} size="sm" />
                {profile.specialization}
              </p>
              <dl className="mt-3 space-y-1.5 text-[15px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Consultation fee</dt>
                  <dd className="tabular font-semibold text-ink">{formatFee(profile.fees)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Experience</dt>
                  <dd className="tabular font-semibold text-ink">{pluralize(Number(profile.experience) || 0, 'year')}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-ink-muted">To change these details, contact the clinic administrator.</p>
            </section>
          ) : null}
        </aside>
      </div>

      <ActionDialog action={action} busy={Boolean(busyId)} onClose={() => setAction(null)} onConfirm={runAction} />

      <Dialog
        open={hoursOpen}
        onClose={() => setHoursOpen(false)}
        variant="drawer"
        title="Working hours"
        description="Patients can only book inside these hours. Existing appointments are kept."
        dismissible={!savingHours}
        footer={
          <div className={cn('flex w-full flex-col gap-3')}>
            {hoursError ? <Alert>{hoursError}</Alert> : null}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setHoursOpen(false)} disabled={savingHours}>
                Close
              </Button>
              <Button className="flex-1" loading={savingHours} loadingText="Saving" onClick={saveHours}>
                Save hours
              </Button>
            </div>
          </div>
        }
      >
        <AvailabilityEditor value={hours} onChange={setHours} />
      </Dialog>
    </div>
  );
}
