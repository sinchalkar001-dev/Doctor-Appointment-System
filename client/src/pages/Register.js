import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail, User } from 'lucide-react';
import { authAPI } from '../api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { Field, Input, PasswordInput, describedBy } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { cn } from '../lib/cn';
import { firstName } from '../lib/format';

const MIN_PASSWORD = 6;

export default function Register({ onSession }) {
  useDocumentTitle('Create account');
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const passwordRef = useRef(null);

  const from = location.state?.from;
  const bookingFor = from?.state?.doctorName;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordLongEnough = password.length >= MIN_PASSWORD;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!passwordLongEnough) {
      setPasswordError(`Use at least ${MIN_PASSWORD} characters.`);
      passwordRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.register({ name: name.trim(), email: email.trim(), password });
      if (response.data.success) {
        const { token, user } = response.data;
        onSession({ token, user });
        notify({ title: `Account created. Welcome, ${firstName(user.name) || 'there'}` });
        const destination = from?.pathname ? `${from.pathname}${from.search || ''}` : '/';
        navigate(destination, { replace: true, state: from?.state });
      } else {
        setError(response.data.message || 'Your account could not be created.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordHint = (
    <span className="flex items-center gap-2">
      <CheckCircle2
        className={cn('h-4 w-4 shrink-0', passwordLongEnough ? 'text-confirmed' : 'text-line-strong')}
        aria-hidden="true"
      />
      At least {MIN_PASSWORD} characters
    </span>
  );

  return (
    <div className="container-page py-12 sm:py-20">
      <div className="mx-auto w-full max-w-[26rem]">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Create your account</h1>
        <p className="mt-3 text-lg text-ink-soft">
          {bookingFor
            ? `Create an account to finish booking with ${bookingFor}.`
            : 'Book with doctors in every department and keep track of each appointment in one place.'}
        </p>

        <form onSubmit={handleSubmit} className="plate mt-8 space-y-5 p-6 shadow-raise sm:p-8">
          {error ? <Alert>{error}</Alert> : null}
          <Field id="register-name" label="Full name">
            <Input
              id="register-name"
              leadingIcon={User}
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field id="register-email" label="Email">
            <Input
              id="register-email"
              type="email"
              leadingIcon={Mail}
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field id="register-password" label="Password" hint={passwordHint} error={passwordError}>
            <PasswordInput
              ref={passwordRef}
              id="register-password"
              autoComplete="new-password"
              required
              invalid={Boolean(passwordError)}
              aria-describedby={describedBy('register-password', { error: passwordError, hint: true })}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordError('');
              }}
            />
          </Field>
          <Button type="submit" size="lg" block loading={loading} loadingText="Creating account">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-ink-soft">
          Already registered?{' '}
          <Link to="/login" state={location.state} className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
