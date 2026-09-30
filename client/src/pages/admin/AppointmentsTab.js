import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../api';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DepartmentTile from '../../components/ui/DepartmentTile';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import { TabList } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/cn';
import { formatDate, formatTime, pluralize } from '../../lib/format';
import { TABLE, TD, TH, THEAD } from './tableStyles';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 20;

function RowActions({ appointment, busyId, onConfirm, onCancel }) {
  const patient = appointment.user?.name || 'the patient';
  const busy = busyId === appointment._id;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {appointment.status === 'pending' ? (
        <Button
          size="sm"
          onClick={() => onConfirm(appointment)}
          loading={busy}
          disabled={Boolean(busyId) && !busy}
          aria-label={`Confirm appointment for ${patient}`}
        >
          <Check aria-hidden="true" />
          Confirm
        </Button>
      ) : null}
      {appointment.status !== 'cancelled' ? (
        <Button
          variant="danger-ghost"
          size="sm"
          onClick={() => onCancel(appointment)}
          disabled={Boolean(busyId)}
          aria-label={`Cancel appointment for ${patient}`}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

export default function AppointmentsTab({ status, onStatusChange }) {
  const { notify } = useToast();
  const [page, setPage] = useState(1);
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      requestId.current += 1;
      const current = requestId.current;
      if (!silent) setLoading(true);
      setError('');
      try {
        const response = await adminAPI.getAppointments({ status: status || undefined, page, limit: PAGE_SIZE });
        if (current !== requestId.current) return;
        setAppointments(response.data.appointments || []);
        setPagination(response.data.pagination || null);
      } catch (err) {
        if (current !== requestId.current) return;
        setError(err.response?.data?.message || 'Appointments could not be loaded.');
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [status, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = (nextStatus) => {
    setPage(1);
    onStatusChange(nextStatus);
  };

  const updateStatus = async (appointment, nextStatus) => {
    setBusyId(appointment._id);
    try {
      const response = await adminAPI.updateAppointmentStatus(appointment._id, { status: nextStatus });
      if (response.data.success) {
        notify({
          title: nextStatus === 'confirmed' ? 'Appointment confirmed' : 'Appointment cancelled',
          description: `${appointment.user?.name || 'Patient'} with ${appointment.doctor?.name || 'the doctor'}`,
        });
        await load({ silent: true });
        return true;
      }
    } catch (err) {
      notify({
        tone: 'error',
        title: nextStatus === 'confirmed' ? 'The appointment could not be confirmed' : 'The appointment could not be cancelled',
        description: err.response?.data?.message || 'Try again in a moment.',
      });
    } finally {
      setBusyId(null);
    }
    return false;
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    const done = await updateStatus(toCancel, 'cancelled');
    setCancelling(false);
    if (done) setToCancel(null);
  };

  const total = pagination?.total ?? appointments.length;
  const pages = pagination?.pages || 1;

  let content;
  if (loading) {
    content = (
      <div className="plate divide-y divide-line" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-6 p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="ml-auto h-9 w-24" />
          </div>
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <Alert
        title="Appointments didn’t load"
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
  } else if (appointments.length === 0) {
    content = (
      <EmptyState
        icon={CalendarDays}
        title={status ? `No ${status} appointments` : 'No appointments yet'}
        description={
          status
            ? 'Try another status to see the rest.'
            : 'Appointments appear here as soon as patients book them.'
        }
      />
    );
  } else {
    content = (
      <div className="plate overflow-hidden">
        <div className="hidden md:block">
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>
                  Patient
                </th>
                <th scope="col" className={TH}>
                  Doctor
                </th>
                <th scope="col" className={TH}>
                  Date and time
                </th>
                <th scope="col" className={TH}>
                  Status
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {appointments.map((appointment) => (
                <tr key={appointment._id}>
                  <td className={TD}>
                    <p className="font-semibold text-ink">{appointment.user?.name || 'Deleted user'}</p>
                    <p className="text-sm text-ink-muted">{appointment.user?.email}</p>
                    {appointment.reason ? (
                      <p className="mt-1 line-clamp-1 max-w-xs text-sm text-ink-muted">Reason: {appointment.reason}</p>
                    ) : null}
                  </td>
                  <td className={TD}>
                    <div className="flex items-start gap-2.5">
                      {appointment.doctor?.specialization ? (
                        <DepartmentTile department={appointment.doctor.specialization} size="sm" className="mt-0.5" />
                      ) : null}
                      <div>
                        <p className="font-semibold text-ink">{appointment.doctor?.name || 'Doctor no longer listed'}</p>
                        <p className="text-sm text-ink-muted">{appointment.doctor?.specialization}</p>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>
                    <p className="tabular text-ink">{formatDate(appointment.date)}</p>
                    <p className="tabular text-sm text-ink-muted">{formatTime(appointment.time)}</p>
                  </td>
                  <td className={TD}>
                    <StatusBadge status={appointment.status} />
                  </td>
                  <td className={TD}>
                    <RowActions
                      appointment={appointment}
                      busyId={busyId}
                      onConfirm={(item) => updateStatus(item, 'confirmed')}
                      onCancel={setToCancel}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-line md:hidden">
          {appointments.map((appointment) => (
            <li key={appointment._id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{appointment.user?.name || 'Deleted user'}</p>
                  <p className="truncate text-sm text-ink-muted">{appointment.user?.email}</p>
                </div>
                <StatusBadge status={appointment.status} />
              </div>
              <p className="flex items-center gap-2 text-[15px] text-ink-soft">
                {appointment.doctor?.specialization ? (
                  <DepartmentTile department={appointment.doctor.specialization} size="xs" />
                ) : null}
                {appointment.doctor?.name || 'Doctor no longer listed'}
              </p>
              <p className="tabular text-[15px] text-ink-soft">
                {formatDate(appointment.date)}, {formatTime(appointment.time)}
              </p>
              <RowActions
                appointment={appointment}
                busyId={busyId}
                onConfirm={(item) => updateStatus(item, 'confirmed')}
                onCancel={setToCancel}
              />
            </li>
          ))}
        </ul>

        {pages > 1 ? (
          <nav
            aria-label="Pagination"
            className="flex items-center justify-between gap-4 border-t border-line bg-surface-muted px-5 py-3"
          >
            <p className="tabular text-sm text-ink-muted">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                <ChevronLeft aria-hidden="true" />
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
                Next
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </nav>
        ) : null}
      </div>
    );
  }

  return (
    <section aria-labelledby="admin-appointments-title" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="admin-appointments-title" className="text-2xl font-bold">
            Appointments
          </h2>
          <p className="mt-1 text-ink-muted" aria-live="polite">
            {loading ? 'Loading…' : pluralize(total, status ? `${status} appointment` : 'appointment')}
          </p>
        </div>
        <TabList
          variant="segmented"
          label="Filter by status"
          idPrefix="admin-status"
          tabs={FILTERS}
          value={status}
          onChange={changeStatus}
        />
      </div>

      {content}

      <ConfirmDialog
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        onConfirm={confirmCancel}
        loading={cancelling}
        title="Cancel this appointment?"
        description={
          toCancel
            ? `${toCancel.user?.name || 'The patient'}’s appointment with ${toCancel.doctor?.name || 'the doctor'} on ${formatDate(
                toCancel.date,
                'EEEE d MMMM'
              )} at ${formatTime(toCancel.time)} will be cancelled.`
            : undefined
        }
        confirmLabel="Cancel appointment"
        cancelLabel="Keep appointment"
      />
    </section>
  );
}
