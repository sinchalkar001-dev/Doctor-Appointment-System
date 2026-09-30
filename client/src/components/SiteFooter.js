import React from 'react';
import { Link } from 'react-router-dom';
import { Siren } from 'lucide-react';
import Logo from './Logo';

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[15px] font-bold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              state={link.state}
              className="rounded-sm text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function SiteFooter({ user }) {
  const year = new Date().getFullYear();

  const careLinks = [
    { to: '/', label: 'Find a doctor' },
    { to: '/dashboard', state: { openBooking: true }, label: 'Book appointment' },
    { to: '/dashboard', label: 'My appointments' },
  ];

  let accountLinks = null;
  if (!user) {
    accountLinks = [
      { to: '/login', label: 'Sign in' },
      { to: '/register', label: 'Create account' },
    ];
  } else if (user.role === 'admin') {
    accountLinks = [{ to: '/admin', label: 'Admin' }];
  }

  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-4 text-ink-muted">
            Find a doctor by department, compare experience and fees, and book a visit online.
          </p>
        </div>
        <FooterColumn title="Care" links={careLinks} />
        {accountLinks ? <FooterColumn title="Account" links={accountLinks} /> : null}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-5 text-sm text-ink-muted md:flex-row md:items-center md:justify-between">
          <p>© {year} E-Medico</p>
          <p className="flex items-start gap-2 md:items-center">
            <Siren className="mt-0.5 h-4 w-4 shrink-0 text-danger md:mt-0" aria-hidden="true" />
            In a medical emergency, call your local emergency number straight away.
          </p>
        </div>
      </div>
    </footer>
  );
}
