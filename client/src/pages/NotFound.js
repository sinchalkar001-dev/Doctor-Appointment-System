import React from 'react';
import { Link } from 'react-router-dom';
import { CornerUpLeft } from 'lucide-react';
import { buttonClasses } from '../components/ui/Button';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-page py-16 sm:py-24">
      <p className="on-sign inline-flex items-center gap-2.5 rounded-plate bg-sign px-4 py-2.5 font-bold text-ink-inverse">
        <CornerUpLeft className="h-5 w-5 text-signal" aria-hidden="true" />
        Error 404
      </p>
      <h1 className="mt-8 max-w-2xl text-5xl font-extrabold tracking-tight sm:text-6xl">This page doesn’t exist</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-soft">
        The link may be broken, or the page may have moved. Head back to the doctor directory to keep going.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className={buttonClasses({ size: 'lg' })}>
          Find a doctor
        </Link>
        <Link to="/dashboard" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
          My appointments
        </Link>
      </div>
    </div>
  );
}
