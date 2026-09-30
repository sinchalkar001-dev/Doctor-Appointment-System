import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarPlus, CalendarX, History, RefreshCw, Signpost } from 'lucide-react';
import { appointmentAPI, doctorAPI } from '../api';
import AppointmentForm from '../components/AppointmentForm';
import AppointmentItem from '../components/AppointmentItem';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DepartmentTile from '../components/ui/DepartmentTile';
import Dialog from '../components/ui/Dialog';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import StatusBadge, { STATUS_META } from '../components/ui/StatusBadge';
import { TabList, TabPanel } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import {
  firstName,
  formatDate,
  formatFee,
  formatTime,
  greeting,
  parseDateKey,
  pluralize,
  relativeDay,
  toDateTime,
} from '../lib/format';

const FILTERS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

const EMPTY_STATES = {
  upcoming: {
    icon: CalendarPlus,
    title: 'No upcoming appointments',
    description: 'Book an appointment and it will be listed here with its status.',
  },
  past: {
    icon: History,
    title: 'No past visits yet',
    description: 'Appointments move here once their date and time have passed.',
  },
  cancelled: {
    icon: CalendarX,
    title: 'Nothing cancelled',
    description: 'Appointments you cancel stay here for your records.',
  },
};

const TIPS = [
  'Arrive 10 minutes early to check in.',
  'Bring earlier prescriptions and test reports.',
  'Carry a photo ID.',
  'If your plans change, cancel here so someone else can take the slot.',
];

function NextVisit({ appointment, loading, onBook, onCancel }) {
  if (loading) {
    return <div aria-hidden="true" className="h-52 animate-pulse rounded-plate bg-sign/90" />;
  }

  const date = appointment ? parseDateKey(appointment.date) : null;
  const doctor = appointment?.doctor;

  return (
    <section aria-labelledby="next-visit-title" className="on-sign overflow-hidden rounded-plate bg-sign text-ink-inverse">
      <div className="flex items-center justify-between gap-3 border-b border-sign-line px-5 py-3 sm:px-6">
        <h2 id="next-visit-title" className="flex items-center gap-2 text-base font-bold text-ink-inverse">
          <Signpost className="h-5 w-5 text-signal" aria-hidden="true" />
          Next visit
        </h2>
        {appointment ? <span className="text-sm font-semibold text-signal">{relativeDay(appointment.date)}</span> : null}
      </div>

      {appointment ? (
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex w-24 shrink-0 flex-col items-center rounded-lg bg-sign-raised py-3 text-center">
            <span className="text-sm font-semibold text-sign-muted">{date ? format(date, 'EEE') : ''}</span>
            <span className="tabular text-5xl font-extrabold leading-none">{date ? format(date, 'd') : '?'}</span>
            <span className="mt-1 text-sm font-semibold text-sign-muted">{date ? format(date, 'MMM') : ''}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="tabular text-3xl font-extrabold tracking-tight sm:text-4xl">{formatTime(appointment.time)}</p>
            <p className="mt-2 flex items-center gap-2.5 text-lg font-semibold">
              {doctor?.specialization ? <DepartmentTile department={doctor.specialization} size="sm" /> : null}
              <span className="truncate">{doctor?.name || 'Doctor no longer listed'}</span>
            </p>
            <p className="mt-1 text-sign-muted">
              {[doctor?.specialization, doctor?.fees !== undefined ? formatFee(doctor.fees) : null]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
            <StatusBadge status={appointment.status} />
            <Button variant="sign-ghost" size="sm" onClick={() => onCancel(appointment)}>
              Cancel appointment
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-2xl font-bold">No upcoming visits</p>
            <p className="mt-1 text-sign-muted">Book an appointment and it will show up here.</p>
          </div>
          <Button variant="signal" size="lg" onClick={onBook}>
            <CalendarPlus aria-hidden="true" />
            Book appointment
          </Button>
        </div>
      )}
    </section>
  );
}

export default function Dashboard({ user }) {
  useDocumentTitle('My appointments');
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadAppointments = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await appointmentAPI.getAll();
      if (response.data.success) setAppointments(response.data.appointments || []);
      else setError(response.data.message || 'Your appointments could not be loaded.');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Your appointments could not be loaded. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    setDoctorsError('');
    try {
      const response = await doctorAPI.getAll({ limit: 100 });
      if (response.data.success) setDoctors(response.data.doctors || []);
      else setDoctorsError('The doctor list could not be loaded.');
    } catch {
      setDoctorsError('The doctor list could not be loaded.');
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadDoctors();
  }, [loadAppointments, loadDoctors]);

  // Open the booking drawer when arriving from a doctor card or a "Book appointment" link.
  useEffect(() => {
    const state = location.state;
    if (!state || (!state.doctorId && !state.openBooking)) return;
    setBookingDoctorId(state.doctorId || '');
    setBookingOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const groups = useMemo(() => {
    const now = new Date();
    const timed = appointments.map((appointment) => ({
      appointment,
      at: toDateTime(appointment.date, appointment.time),
    }));
    const stamp = (entry) => (entry.at ? entry.at.getTime() : 0);
    const active = timed.filter((entry) => entry.appointment.status !== 'cancelled');

    return {
      upcoming: active
        .filter((entry) => entry.at && entry.at >= now)
        .sort((a, b) => stamp(a) - stamp(b))
        .map((entry) => entry.appointment),
      past: active
        .filter((entry) => !entry.at || entry.at < now)
        .sort((a, b) => stamp(b) - stamp(a))
        .map((entry) => entry.appointment),
      cancelled: timed
        .filter((entry) => entry.appointment.status === 'cancelled')
        .sort((a, b) => stamp(b) - stamp(a))
        .map((entry) => entry.appointment),
    };
  }, [appointments]);

  const nextVisit = groups.upcoming[0];
  const awaiting = groups.upcoming.filter((appointment) => appointment.status === 'pending').length;

  const openBooking = (doctorId = '') => {
    setBookingDoctorId(doctorId);
    setBookingOpen(true);
  };

  const closeBooking = () => setBookingOpen(false);

  const handleBooked = () => {
    setFilter('upcoming');
    loadAppointments({ silent: true });
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      const response = await appointmentAPI.cancel(toCancel._id);
      if (response.data.success) {
        setAppointments((current) =>
          current.map((appointment) =>
            appointment._id === toCancel._id ? { ...appointment, status: 'cancelled' } : appointment
          )
        );
        notify({
          title: 'Appointment cancelled',
          description: `${toCancel.doctor?.name || 'Your appointment'}, ${formatDate(toCancel.date, 'EEE d MMM')} at ${formatTime(toCancel.time)}`,
        });
        setToCancel(null);
      } else {
        notify({ tone: 'error', title: 'The appointment could not be cancelled', description: response.data.message });
      }
    } catch (err) {
      notify({
        tone: 'error',
        title: 'The appointment could not be cancelled',
        description: err.response?.data?.message || 'Check your connection and try again.',
      });
    } finally {
      setCancelling(false);
    }
  };

  let summary = 'Loading your appointments…';
  if (error) {
    summary = 'Your appointments are unavailable right now.';
  } else if (!loading) {
    if (groups.upcoming.length === 0) {
      summary = 'You have no upcoming appointments.';
    } else {
      summary = `You have ${pluralize(groups.upcoming.length, 'upcoming appointment')}.`;
      if (awaiting > 0) summary += ` ${awaiting === 1 ? '1 is' : `${awaiting} are`} waiting for confirmation.`;
    }
  }

  const items = groups[filter];
  let list;
  if (loading) {
    list = (
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="plate flex gap-4 p-5">
            <Skeleton className="h-[4.5rem] w-16 rounded-lg" />
            <div className="flex-1 space-y-2.5 pt-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (error) {
    list = (
      <Alert
        title="Your appointments didn’t load"
        action={
          <Button variant="secondary" size="sm" onClick={() => loadAppointments()}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        }
      >
        {error}
      </Alert>
    );
  } else if (items.length === 0) {
    const empty = EMPTY_STATES[filter];
    list = (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={
          filter === 'upcoming' ? (
            <Button onClick={() => openBooking()}>
              <CalendarPlus aria-hidden="true" />
              Book appointment
            </Button>
          ) : null
        }
      />
    );
  } else {
    list = (
      <ul className="space-y-3">
        {items.map((appointment) => (
          <AppointmentItem
            key={appointment._id}
            appointment={appointment}
            onCancel={filter === 'upcoming' ? setToCancel : undefined}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {greeting()}, {firstName(user?.name) || 'there'}
          </h1>
          <p className="mt-3 text-lg text-ink-soft" aria-live="polite">
            {summary}
          </p>
        </div>
        <Button size="lg" onClick={() => openBooking()}>
          <CalendarPlus aria-hidden="true" />
          Book appointment
        </Button>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0 space-y-10">
          <NextVisit
            appointment={nextVisit}
            loading={loading}
            onBook={() => openBooking()}
            onCancel={setToCancel}
          />

          <section aria-labelledby="appointments-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="appointments-title" className="text-2xl font-bold">
                Appointments
              </h2>
              <TabList
                variant="segmented"
                label="Filter appointments"
                idPrefix="appointments"
                tabs={FILTERS.map((item) => ({ ...item, count: loading ? undefined : groups[item.id].length }))}
                value={filter}
                onChange={setFilter}
              />
            </div>
            <TabPanel idPrefix="appointments" value={filter} className="mt-5">
              {list}
            </TabPanel>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section aria-labelledby="status-guide-title" className="plate p-5">
            <h2 id="status-guide-title" className="text-lg font-bold">
              What each status means
            </h2>
            <dl className="mt-4 space-y-3">
              {Object.keys(STATUS_META).map((key) => (
                <div key={key}>
                  <dt>
                    <StatusBadge status={key} />
                  </dt>
                  <dd className="mt-1 text-[15px] text-ink-muted">{STATUS_META[key].meaning}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="tips-title" className="plate p-5">
            <h2 id="tips-title" className="text-lg font-bold">
              Before your visit
            </h2>
            <ul className="mt-3 space-y-3 text-[15px] text-ink-soft">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-[1px] bg-sign" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <Dialog
        open={bookingOpen}
        onClose={closeBooking}
        variant="drawer"
        title="Book an appointment"
        description="Choose a doctor, a date and a time. The clinic confirms each request."
        bodyClassName="flex min-h-0 flex-1 flex-col"
      >
        <AppointmentForm
          doctors={doctors}
          doctorsLoading={doctorsLoading}
          doctorsError={doctorsError}
          onRetryDoctors={loadDoctors}
          initialDoctorId={bookingDoctorId}
          onBooked={handleBooked}
          onClose={closeBooking}
        />
      </Dialog>

      <ConfirmDialog
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        onConfirm={confirmCancel}
        loading={cancelling}
        title="Cancel this appointment?"
        description={
          toCancel
            ? `Your ${formatTime(toCancel.time)} appointment with ${toCancel.doctor?.name || 'the doctor'} on ${formatDate(
                toCancel.date,
                'EEEE d MMMM'
              )} will be cancelled. This can’t be undone.`
            : undefined
        }
        confirmLabel="Cancel appointment"
        cancelLabel="Keep appointment"
      />
    </div>
  );
}
