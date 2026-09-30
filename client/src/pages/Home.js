import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, SearchX, Stethoscope } from 'lucide-react';
import { doctorAPI } from '../api';
import DirectoryBoard from '../components/DirectoryBoard';
import DoctorCard from '../components/DoctorCard';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { Input, Select } from '../components/ui/Field';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { groupDepartments } from '../lib/departments';
import { pluralize, sortableName } from '../lib/format';
import { scrollToId } from '../lib/scroll';

const SORTS = {
  name: { label: 'Name, A to Z', compare: (a, b) => sortableName(a.name).localeCompare(sortableName(b.name)) },
  fee: { label: 'Lowest fee first', compare: (a, b) => (Number(a.fees) || 0) - (Number(b.fees) || 0) },
  experience: {
    label: 'Most experienced first',
    compare: (a, b) => (Number(b.experience) || 0) - (Number(a.experience) || 0),
  },
};

const STEPS = [
  {
    title: 'Choose a department',
    text: 'Start from the directory or search by name. Every doctor lists their experience and consultation fee.',
  },
  {
    title: 'Pick a date and time',
    text: 'Choose a day from tomorrow onwards and a time between 9 AM and 7 PM that suits you.',
  },
  {
    title: 'Get confirmed',
    text: 'Your request shows as pending until the clinic confirms it. Follow it under My appointments.',
  },
];

function DoctorGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="plate overflow-hidden">
          <Skeleton className="h-1.5 rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-40" />
            <div className="flex items-end justify-between border-t border-line pt-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-11 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home({ user }) {
  useDocumentTitle('');
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [sort, setSort] = useState('name');

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await doctorAPI.getAll({ limit: 100 });
      if (response.data.success) setDoctors(response.data.doctors || []);
      else setError(response.data.message || 'The doctor list could not be loaded.');
    } catch (err) {
      setError(
        err.response?.data?.message || 'The doctor list could not be loaded. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const departments = useMemo(() => groupDepartments(doctors), [doctors]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return doctors
      .filter((doctor) => !department || (doctor.specialization || '').trim() === department)
      .filter(
        (doctor) =>
          !term ||
          (doctor.name || '').toLowerCase().includes(term) ||
          (doctor.specialization || '').toLowerCase().includes(term)
      )
      .sort(SORTS[sort].compare);
  }, [doctors, department, query, sort]);

  const filtersActive = Boolean(department || query.trim());

  const handleBook = (doctor) => {
    const booking = { doctorId: doctor._id, doctorName: doctor.name };
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/dashboard', state: booking } } });
      return;
    }
    navigate('/dashboard', { state: booking });
  };

  const chooseDepartment = (name) => {
    setDepartment(name);
    scrollToId('doctors');
  };

  const clearFilters = () => {
    setQuery('');
    setDepartment('');
  };

  let summary = 'Loading doctors…';
  if (error) {
    summary = 'The doctor list is unavailable.';
  } else if (!loading) {
    summary = filtersActive
      ? `Showing ${results.length} of ${pluralize(doctors.length, 'doctor')}`
      : `${pluralize(doctors.length, 'doctor')} in ${pluralize(departments.length, 'department')}`;
  }

  const lead =
    !loading && !error && doctors.length > 0
      ? `Choose from ${pluralize(doctors.length, 'doctor')} across ${pluralize(
          departments.length,
          'department'
        )}. Compare experience and fees, then pick a time that suits you.`
      : 'Compare doctors by department, experience and fee, then pick a time that suits you.';

  let content;
  if (loading) {
    content = <DoctorGridSkeleton />;
  } else if (error) {
    content = (
      <Alert
        title="The doctor list didn’t load"
        action={
          <Button variant="secondary" size="sm" onClick={loadDoctors}>
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
        title="No doctors are listed yet"
        description="Doctors appear here as soon as the clinic adds them."
      />
    );
  } else if (results.length === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No doctors match your search"
        description="Try another name or department, or clear the filters to see everyone."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    content = (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((doctor) => (
          <li key={doctor._id} className="flex">
            <DoctorCard doctor={doctor} onBook={handleBook} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-16 lg:py-20">
          <div className="lg:self-center">
            <h1 className="text-[2.75rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block">Find a doctor.</span>
              <span className="block">Book a visit.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg text-ink-soft">{lead}</p>

            <form
              role="search"
              className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                scrollToId('doctors');
              }}
            >
              <label htmlFor="hero-search" className="sr-only">
                Search by doctor name or specialty
              </label>
              <div className="flex-1">
                <Input
                  id="hero-search"
                  type="search"
                  size="lg"
                  leadingIcon={Search}
                  placeholder="Doctor name or specialty"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button type="submit" size="xl">
                Search
              </Button>
            </form>
          </div>

          <DirectoryBoard
            departments={departments}
            total={doctors.length}
            selected={department}
            onSelect={chooseDepartment}
            loading={loading}
            error={error}
          />
        </div>
      </section>

      <section id="doctors" aria-labelledby="doctors-title" className="container-page scroll-mt-24 py-12 lg:py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="doctors-title" className="text-4xl font-extrabold tracking-tight">
              {department || 'All doctors'}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
              <span aria-live="polite">{summary}</span>
              {filtersActive ? (
                <button type="button" onClick={clearFilters} className="link text-[15px]">
                  Clear filters
                </button>
              ) : null}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[40rem] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="list-search" className="mb-1.5 block text-sm font-semibold text-ink-soft">
                Search
              </label>
              <Input
                id="list-search"
                type="search"
                size="sm"
                leadingIcon={Search}
                placeholder="Name or specialty"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="department-filter" className="mb-1.5 block text-sm font-semibold text-ink-soft">
                Department
              </label>
              <Select
                id="department-filter"
                size="sm"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="doctor-sort" className="mb-1.5 block text-sm font-semibold text-ink-soft">
                Sort by
              </label>
              <Select id="doctor-sort" size="sm" value={sort} onChange={(event) => setSort(event.target.value)}>
                {Object.entries(SORTS).map(([id, option]) => (
                  <option key={id} value={id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-8">{content}</div>
      </section>

      <section aria-labelledby="how-title" className="border-t border-line bg-surface">
        <div className="container-page py-12 lg:py-16">
          <h2 id="how-title" className="text-4xl font-extrabold tracking-tight">
            How booking works
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t-4 border-sign pt-5">
                <span aria-hidden="true" className="tabular block text-5xl font-extrabold leading-none text-ink">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 max-w-[40ch] text-ink-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
