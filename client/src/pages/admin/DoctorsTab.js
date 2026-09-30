import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, SearchX, Stethoscope, Trash2 } from 'lucide-react';
import { adminAPI, doctorAPI } from '../../api';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DepartmentTile from '../../components/ui/DepartmentTile';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/cn';
import { formatFee, pluralize, sortableName } from '../../lib/format';
import DoctorFormDialog from './DoctorFormDialog';
import { TABLE, TD, TH, THEAD } from './tableStyles';

function experienceLabel(doctor) {
  const years = Number(doctor.experience) || 0;
  return years > 0 ? pluralize(years, 'year') : 'Not listed';
}

export default function DoctorsTab() {
  const { notify } = useToast();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toRemove, setToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getDoctors();
      setDoctors(response.data.doctors || []);
    } catch (err) {
      setError(err.response?.data?.message || 'The doctor list could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const specialties = useMemo(
    () =>
      [...new Set(doctors.map((doctor) => (doctor.specialization || '').trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [doctors]
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return doctors
      .filter(
        (doctor) =>
          !term ||
          [doctor.name, doctor.specialization, doctor.phone].some((value) =>
            String(value || '').toLowerCase().includes(term)
          )
      )
      .sort((a, b) => sortableName(a.name).localeCompare(sortableName(b.name)));
  }, [doctors, query]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (doctor) => {
    setEditing(doctor);
    setFormOpen(true);
  };

  const handleSaved = (saved, mode) => {
    setFormOpen(false);
    notify({ title: mode === 'create' ? 'Doctor added' : 'Changes saved', description: saved?.name });
    load({ silent: true });
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    try {
      const response = await doctorAPI.delete(toRemove._id);
      if (response.data.success) {
        setDoctors((current) => current.filter((doctor) => doctor._id !== toRemove._id));
        notify({ title: 'Doctor removed', description: toRemove.name });
        setToRemove(null);
      } else {
        notify({ tone: 'error', title: 'The doctor could not be removed', description: response.data.message });
      }
    } catch (err) {
      notify({
        tone: 'error',
        title: 'The doctor could not be removed',
        description: err.response?.data?.message || 'Check your connection and try again.',
      });
    } finally {
      setRemoving(false);
    }
  };

  let content;
  if (loading) {
    content = (
      <div className="plate divide-y divide-line" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 p-5">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="ml-auto h-5 w-20" />
          </div>
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <Alert
        title="The doctor list didn’t load"
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
  } else if (doctors.length === 0) {
    content = (
      <EmptyState
        icon={Stethoscope}
        title="No doctors yet"
        description="Add the first doctor to open the directory to patients."
        action={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add doctor
          </Button>
        }
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No doctors match your search"
        description="Try a different name, department or phone number."
        action={
          <Button variant="secondary" onClick={() => setQuery('')}>
            Clear search
          </Button>
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
                  Doctor
                </th>
                <th scope="col" className={TH}>
                  Department
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Experience
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Fee
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((doctor) => (
                <tr key={doctor._id}>
                  <td className={TD}>
                    <p className="font-semibold text-ink">{doctor.name}</p>
                    {doctor.phone ? <p className="text-sm text-ink-muted">{doctor.phone}</p> : null}
                  </td>
                  <td className={TD}>
                    <span className="inline-flex items-center gap-2.5">
                      <DepartmentTile department={doctor.specialization} size="sm" />
                      {doctor.specialization}
                    </span>
                  </td>
                  <td className={cn(TD, 'tabular text-right')}>{experienceLabel(doctor)}</td>
                  <td className={cn(TD, 'tabular text-right font-semibold text-ink')}>{formatFee(doctor.fees)}</td>
                  <td className={cn(TD, 'text-right')}>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit"
                        aria-label={`Edit ${doctor.name}`}
                        onClick={() => openEdit(doctor)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="icon-sm"
                        title="Remove"
                        aria-label={`Remove ${doctor.name}`}
                        onClick={() => setToRemove(doctor)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-line md:hidden">
          {visible.map((doctor) => (
            <li key={doctor._id} className="p-4">
              <div className="flex items-start gap-3">
                <DepartmentTile department={doctor.specialization} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{doctor.name}</p>
                  <p className="text-sm text-ink-muted">{doctor.specialization}</p>
                  <p className="tabular mt-1 text-[15px] text-ink-soft">
                    {formatFee(doctor.fees)}, {experienceLabel(doctor).toLowerCase()}
                  </p>
                  {doctor.phone ? <p className="text-sm text-ink-muted">{doctor.phone}</p> : null}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" aria-label={`Edit ${doctor.name}`} onClick={() => openEdit(doctor)}>
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="danger-ghost"
                  size="sm"
                  aria-label={`Remove ${doctor.name}`}
                  onClick={() => setToRemove(doctor)}
                >
                  <Trash2 aria-hidden="true" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section aria-labelledby="admin-doctors-title" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="admin-doctors-title" className="text-2xl font-bold">
            Doctors
          </h2>
          <p className="mt-1 text-ink-muted">
            {loading ? 'Loading…' : `${pluralize(doctors.length, 'doctor')} in the directory`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-72">
            <label htmlFor="doctor-search" className="sr-only">
              Search doctors
            </label>
            <Input
              id="doctor-search"
              type="search"
              size="sm"
              leadingIcon={Search}
              placeholder="Search name, department or phone"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add doctor
          </Button>
        </div>
      </div>

      {content}

      <DoctorFormDialog
        open={formOpen}
        doctor={editing}
        specialties={specialties}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        loading={removing}
        title={`Remove ${toRemove?.name || 'this doctor'}?`}
        description="Patients will no longer see this doctor in the directory. Existing appointments stay on record."
        confirmLabel="Remove doctor"
        cancelLabel="Keep doctor"
      />
    </section>
  );
}
