import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, SearchX, ShieldCheck, Stethoscope, User, Users } from 'lucide-react';
import { adminAPI } from '../../api';
import Alert from '../../components/ui/Alert';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import { formatDate, pluralize } from '../../lib/format';
import { TABLE, TD, TH, THEAD } from './tableStyles';

const ROLES = {
  admin: { label: 'Admin', icon: ShieldCheck, className: 'border-sign bg-sign text-ink-inverse' },
  doctor: { label: 'Doctor', icon: Stethoscope, className: 'border-completed-line bg-completed-soft text-completed-ink' },
  user: { label: 'Patient', icon: User, className: 'border-line bg-surface-sunken text-ink-soft' },
};

function RoleBadge({ role }) {
  const meta = ROLES[role] || ROLES.user;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border px-2 py-1 text-[13px] font-semibold leading-none',
        meta.className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function joined(value) {
  return value ? formatDate(value, 'd MMM yyyy') : 'Unknown';
}

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Users could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.name, user.email].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [users, query]);

  let content;
  if (loading) {
    content = (
      <div className="plate divide-y divide-line" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 p-5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="ml-auto h-5 w-24" />
          </div>
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <Alert
        title="Users didn’t load"
        action={
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        }
      >
        {error}
      </Alert>
    );
  } else if (users.length === 0) {
    content = <EmptyState icon={Users} title="No users yet" description="People who register appear here." />;
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No users match your search"
        description="Try a different name or email address."
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
                  User
                </th>
                <th scope="col" className={TH}>
                  Role
                </th>
                <th scope="col" className={cn(TH, 'text-right')}>
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((user) => (
                <tr key={user._id}>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} tone={user.role === 'admin' ? 'brand' : 'neutral'} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{user.name}</p>
                        <p className="truncate text-sm text-ink-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>
                    <RoleBadge role={user.role} />
                  </td>
                  <td className={cn(TD, 'tabular text-right text-ink-soft')}>{joined(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-line md:hidden">
          {visible.map((user) => (
            <li key={user._id} className="flex items-center gap-3 p-4">
              <Avatar name={user.name} tone={user.role === 'admin' ? 'brand' : 'neutral'} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{user.name}</p>
                <p className="truncate text-sm text-ink-muted">{user.email}</p>
                <p className="mt-0.5 text-sm text-ink-muted">Joined {joined(user.createdAt)}</p>
              </div>
              <RoleBadge role={user.role} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section aria-labelledby="admin-users-title" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="admin-users-title" className="text-2xl font-bold">
            Users
          </h2>
          <p className="mt-1 text-ink-muted">{loading ? 'Loading…' : `${pluralize(users.length, 'registered user')}`}</p>
        </div>
        <div className="sm:w-72">
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <Input
            id="user-search"
            type="search"
            size="sm"
            leadingIcon={Search}
            placeholder="Search name or email"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      {content}
    </section>
  );
}
