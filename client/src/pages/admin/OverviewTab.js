import React, { useCallback, useEffect, useState } from 'react';
import { Check, CheckCircle2, Hourglass, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../api';
import { useLiveEvent } from '../../components/LiveProvider';
import StatusBreakdown from '../../components/StatusBreakdown';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import DepartmentTile from '../../components/ui/DepartmentTile';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatTime, pluralize, toDateTime } from '../../lib/format';

function StatTile({ label, value, note }) {
  return (
    <div className="bg-surface p-5 sm:p-6">
      <dt className="text-[15px] font-semibold text-ink-muted">{label}</dt>
      <dd className="tabular mt-2 text-4xl font-extrabold tracking-tight text-ink">{value ?? 0}</dd>
      {note ? <dd className="mt-1 text-sm text-ink-muted">{note}</dd> : null}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-plate border border-line bg-line lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-3 bg-surface p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-plate" />
        <Skeleton className="h-52 rounded-plate" />
      </div>
    </div>
  );
}

export default function OverviewTab({ onReviewPending }) {
  const { notify } = useToast();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [statsResponse, pendingResponse] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAppointments({ status: 'pending', limit: 5 }),
      ]);
      setStats(statsResponse.data.stats);
      const soonestFirst = [...(pendingResponse.data.appointments || [])].sort(
        (a, b) => (toDateTime(a.date, a.time)?.getTime() || 0) - (toDateTime(b.date, b.time)?.getTime() || 0)
      );
      setPending(soonestFirst);
    } catch (err) {
      setError(err.response?.data?.message || 'The overview could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveEvent('appointment', () => load({ silent: true }));
  useLiveEvent('directory', () => load({ silent: true }));
  useLiveEvent('reconnected', () => load({ silent: true }));

  const confirm = async (appointment) => {
    setBusyId(appointment._id);
    try {
      const response = await adminAPI.updateAppointmentStatus(appointment._id, { status: 'confirmed' });
      if (response.data.success) {
        notify({
          title: 'Appointment confirmed',
          description: `${appointment.user?.name || 'Patient'} with ${appointment.doctor?.name || 'the doctor'}`,
        });
        await load({ silent: true });
      }
    } catch (err) {
      notify({
        tone: 'error',
        title: 'The appointment could not be confirmed',
        description: err.response?.data?.message || 'Try again in a moment.',
      });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <OverviewSkeleton />;

  if (error || !stats) {
    return (
      <Alert
        title="The overview didn’t load"
        action={
          <Button variant="secondary" size="sm" onClick={() => load()}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        }
      >
        {error || 'No data was returned.'}
      </Alert>
    );
  }

  const total = stats.totalAppointments || 0;
  const pendingCount = stats.pendingAppointments || 0;
  const confirmedCount = stats.confirmedAppointments || 0;
  const completedCount = stats.completedAppointments || 0;
  const cancelledCount =
    stats.cancelledAppointments ?? Math.max(total - pendingCount - confirmedCount - completedCount, 0);

  return (
    <div className="space-y-8">
      <section aria-labelledby="key-numbers-title">
        <h2 id="key-numbers-title" className="sr-only">
          Key numbers
        </h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-plate border border-line bg-line lg:grid-cols-4">
          <StatTile
            label="Doctors"
            value={stats.totalDoctors}
            note={typeof stats.doctorsWithPortal === 'number' ? `${stats.doctorsWithPortal} can sign in` : null}
          />
          <StatTile label="Registered users" value={stats.totalUsers} />
          <StatTile
            label="Appointments"
            value={total}
            note={typeof stats.todayAppointments === 'number' ? `${stats.todayAppointments} scheduled today` : null}
          />
          <StatTile
            label="Awaiting confirmation"
            value={pendingCount}
            note={
              pendingCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-pending-ink">
                  <Hourglass className="h-4 w-4" aria-hidden="true" />
                  Needs review
                </span>
              ) : (
                'All caught up'
              )
            }
          />
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <StatusBreakdown
          counts={{ pending: pendingCount, confirmed: confirmedCount, completed: completedCount, cancelled: cancelledCount }}
        />

        <section aria-labelledby="queue-title" className="plate">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 id="queue-title" className="text-lg font-bold">
                Awaiting confirmation
              </h2>
              <p className="text-sm text-ink-muted">
                {pendingCount > pending.length
                  ? `The next ${pending.length} of ${pendingCount} requests`
                  : pluralize(pendingCount, 'request')}
              </p>
            </div>
            {pendingCount > 0 ? (
              <Button variant="secondary" size="sm" onClick={onReviewPending}>
                Review all
              </Button>
            ) : null}
          </div>

          {pending.length === 0 ? (
            <p className="flex items-center gap-3 px-5 py-8 text-ink-muted sm:px-6">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-confirmed" aria-hidden="true" />
              No requests are waiting. New bookings appear here.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((appointment) => {
                const patient = appointment.user?.name || 'Unknown patient';
                const doctor = appointment.doctor?.name || 'Doctor no longer listed';
                return (
                  <li key={appointment._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{patient}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                        <span className="inline-flex items-center gap-1.5">
                          {appointment.doctor?.specialization ? (
                            <DepartmentTile department={appointment.doctor.specialization} size="xs" />
                          ) : null}
                          {doctor}
                        </span>
                        <span className="tabular">
                          {formatDate(appointment.date, 'EEE d MMM')}, {formatTime(appointment.time)}
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => confirm(appointment)}
                      loading={busyId === appointment._id}
                      disabled={Boolean(busyId) && busyId !== appointment._id}
                      aria-label={`Confirm appointment for ${patient} with ${doctor}`}
                    >
                      <Check aria-hidden="true" />
                      Confirm
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
