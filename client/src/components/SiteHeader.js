import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronDown, LayoutDashboard, LogOut, Menu, UserCog, X } from 'lucide-react';
import Logo from './Logo';
import Avatar from './ui/Avatar';
import Button, { buttonClasses } from './ui/Button';
import { cn } from '../lib/cn';
import { firstName } from '../lib/format';

function navItems(user) {
  const items = [{ to: '/', label: 'Find a doctor', end: true }];
  if (user?.role === 'doctor') items.push({ to: '/doctor', label: 'Schedule' });
  else if (user) items.push({ to: '/dashboard', label: 'My appointments' });
  if (user?.role === 'admin') items.push({ to: '/admin', label: 'Admin' });
  return items;
}

const menuItemClass =
  'flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[15px] font-semibold text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:text-ink-muted';

function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const location = useLocation();
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    setOpen(false);
  }, [location.key]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 items-center gap-2 rounded-control pl-1.5 pr-2.5 text-ink transition-colors hover:bg-surface-sunken"
      >
        <Avatar name={user.name} tone={isAdmin ? 'brand' : 'neutral'} />
        <span className="max-w-[9rem] truncate text-[15px] font-semibold">{firstName(user.name) || 'Account'}</span>
        <ChevronDown className={cn('h-4 w-4 text-ink-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
        <span className="sr-only">account menu</span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id="account-menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 animate-menu-in overflow-hidden rounded-plate border border-line bg-surface shadow-overlay"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-semibold text-ink">{user.name}</p>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
          </div>
          <ul className="p-1.5">
            <li>
              <Link to={user.role === 'doctor' ? '/doctor' : '/dashboard'} className={menuItemClass}>
                <CalendarDays aria-hidden="true" />
                {user.role === 'doctor' ? 'Schedule' : 'My appointments'}
              </Link>
            </li>
            {isAdmin ? (
              <li>
                <Link to="/admin" className={menuItemClass}>
                  <LayoutDashboard aria-hidden="true" />
                  Admin
                </Link>
              </li>
            ) : null}
            <li>
              <Link to="/account" className={menuItemClass}>
                <UserCog aria-hidden="true" />
                Account settings
              </Link>
            </li>
            <li>
              <button type="button" onClick={onSignOut} className={menuItemClass}>
                <LogOut aria-hidden="true" />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function SiteHeader({ user, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const items = navItems(user);
  // The dashboard has its own booking button, and doctors don't book from the header.
  const showBookButton = location.pathname !== '/dashboard' && user?.role !== 'doctor';
  const mobileItems = user ? [...items, { to: '/account', label: 'Account settings' }] : items;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.key]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center gap-8">
        <Link to="/" aria-label="E-Medico home" className="rounded-control">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden h-full md:block">
          <ul className="flex h-full items-center">
            {items.map((item) => (
              <li key={item.to} className="h-full">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative flex h-full items-center px-3 text-[15px] font-semibold transition-colors focus-visible:[outline-offset:-6px]',
                      isActive
                        ? 'text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t-sm after:bg-action'
                        : 'text-ink-muted hover:text-ink'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {showBookButton ? (
                <Link to="/dashboard" state={{ openBooking: true }} className={buttonClasses({ size: 'sm' })}>
                  <CalendarPlus aria-hidden="true" />
                  Book appointment
                </Link>
              ) : null}
              <UserMenu user={user} onSignOut={onSignOut} />
            </>
          ) : (
            <>
              <Link to="/login" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                Sign in
              </Link>
              <Link to="/register" className={buttonClasses({ size: 'sm' })}>
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((current) => !current)}
          className="-mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-control text-ink transition-colors hover:bg-surface-sunken md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {menuOpen ? (
        <div id="mobile-menu" className="animate-menu-in border-t border-line bg-surface md:hidden">
          <nav aria-label="Main" className="container-page py-3">
            <ul className="space-y-1">
              {mobileItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex h-12 items-center rounded-control px-3 text-base font-semibold transition-colors',
                        isActive ? 'bg-action-soft text-ink' : 'text-ink-soft hover:bg-surface-sunken'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="container-page border-t border-line py-4">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} size="lg" tone={user.role === 'admin' ? 'brand' : 'neutral'} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-sm text-ink-muted">{user.email}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {user.role !== 'doctor' ? (
                    <Link to="/dashboard" state={{ openBooking: true }} className={buttonClasses({ block: true })}>
                      <CalendarPlus aria-hidden="true" />
                      Book appointment
                    </Link>
                  ) : null}
                  <Button variant="secondary" block onClick={onSignOut}>
                    <LogOut aria-hidden="true" />
                    Sign out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className={buttonClasses({ variant: 'secondary', block: true })}>
                  Sign in
                </Link>
                <Link to="/register" className={buttonClasses({ block: true })}>
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
