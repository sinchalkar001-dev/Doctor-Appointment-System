import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { authAPI } from '../api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { Field, Input, PasswordInput } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { firstName } from '../lib/format';

const DEMO_PASSWORD = 'password123';
const DEMO_ACCOUNTS = [
  { label: 'Patient', email: 'john@example.com' },
  { label: 'Admin', email: 'admin@example.com' },
];

export default function Login({ setUser }) {
  useDocumentTitle('Sign in');
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const submitRef = useRef(null);

  const from = location.state?.from;
  const bookingFor = from?.state?.doctorName;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login({ email: email.trim(), password });
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        notify({ title: `Welcome back, ${firstName(user.name) || 'there'}` });
        const destination = from?.pathname ? `${from.pathname}${from.search || ''}` : '/';
        navigate(destination, { replace: true, state: from?.state });
      } else {
        setError(response.data.message || 'Sign in failed. Check your email and password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError('');
    submitRef.current?.focus();
  };

  return (
    <div className="container-page py-12 sm:py-20">
      <div className="mx-auto w-full max-w-[26rem]">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Sign in</h1>
        <p className="mt-3 text-lg text-ink-soft">
          {bookingFor
            ? `Sign in to finish booking with ${bookingFor}.`
            : 'Sign in to book appointments and follow their status.'}
        </p>

        <form onSubmit={handleSubmit} className="plate mt-8 space-y-5 p-6 shadow-raise sm:p-8">
          {error ? <Alert>{error}</Alert> : null}
          <Field id="login-email" label="Email">
            <Input
              id="login-email"
              type="email"
              leadingIcon={Mail}
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field id="login-password" label="Password">
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Button ref={submitRef} type="submit" size="lg" block loading={loading} loadingText="Signing in">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-ink-soft">
          New to E-Medico?{' '}
          <Link to="/register" state={location.state} className="link">
            Create an account
          </Link>
        </p>

        <section aria-labelledby="demo-title" className="mt-10 border-t border-line pt-6">
          <h2 id="demo-title" className="text-base font-bold">
            Demo accounts
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Both use the password <span className="font-semibold text-ink-soft">{DEMO_PASSWORD}</span>.
          </p>
          <ul className="mt-4 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li
                key={account.email}
                className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{account.label}</p>
                  <p className="truncate text-sm text-ink-muted">{account.email}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fillDemo(account)}
                  aria-label={`Use the ${account.label.toLowerCase()} demo account`}
                >
                  Use
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
