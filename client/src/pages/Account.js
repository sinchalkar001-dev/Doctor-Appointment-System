import React, { useState } from 'react';
import { KeyRound, Mail, Phone, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { authAPI } from '../api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { Field, Input, PasswordInput, describedBy } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const ROLE_LABEL = {
  user: { label: 'Patient account', icon: User },
  doctor: { label: 'Doctor account', icon: Stethoscope },
  admin: { label: 'Administrator account', icon: ShieldCheck },
};

function ProfileForm({ user, onSession }) {
  const { notify } = useToast();
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await authAPI.updateProfile({ name: name.trim(), phone: phone.trim() });
      onSession({ user: response.data.user });
      notify({ title: 'Profile saved' });
    } catch (err) {
      setError(err.response?.data?.message || 'Your profile could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="plate space-y-5 p-6 sm:p-8" aria-labelledby="profile-title">
      <h2 id="profile-title" className="text-xl font-bold">
        Profile
      </h2>
      {error ? <Alert>{error}</Alert> : null}
      <Field id="account-name" label="Full name">
        <Input
          id="account-name"
          leadingIcon={User}
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field id="account-email" label="Email" hint="Your email is your sign-in and can’t be changed here.">
        <Input
          id="account-email"
          type="email"
          leadingIcon={Mail}
          value={user.email}
          disabled
          aria-describedby="account-email-hint"
        />
      </Field>
      <Field
        id="account-phone"
        label="Phone"
        optional
        hint={user.role === 'user' ? 'Your doctor can use this to reach you about an appointment.' : 'The clinic uses this to reach you.'}
      >
        <Input
          id="account-phone"
          type="tel"
          leadingIcon={Phone}
          autoComplete="tel"
          maxLength={30}
          value={phone}
          aria-describedby="account-phone-hint"
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>
      <Button type="submit" loading={saving} loadingText="Saving">
        Save profile
      </Button>
    </form>
  );
}

function PasswordForm({ onSession }) {
  const { notify } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const nextErrors = {};
    if (!current) nextErrors.current = 'Enter your current password.';
    if (next.length < 6) nextErrors.next = 'Use at least 6 characters.';
    else if (next === current) nextErrors.next = 'Choose a password that is different from the current one.';
    if (repeat !== next) nextErrors.repeat = 'The passwords don’t match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const response = await authAPI.changePassword({ currentPassword: current, newPassword: next });
      onSession({ token: response.data.token, user: response.data.user });
      setCurrent('');
      setNext('');
      setRepeat('');
      notify({ title: 'Password changed', description: 'Other devices have been signed out.' });
    } catch (err) {
      setError(err.response?.data?.message || 'Your password could not be changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="plate space-y-5 p-6 sm:p-8" aria-labelledby="password-title">
      <div>
        <h2 id="password-title" className="flex items-center gap-2 text-xl font-bold">
          <KeyRound className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          Password
        </h2>
        <p className="mt-1 text-[15px] text-ink-muted">Changing it signs you out everywhere else.</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Field id="current-password" label="Current password" error={errors.current}>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          invalid={Boolean(errors.current)}
          aria-describedby={describedBy('current-password', { error: errors.current })}
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
      </Field>
      <Field id="new-password" label="New password" hint="At least 6 characters" error={errors.next}>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          invalid={Boolean(errors.next)}
          aria-describedby={describedBy('new-password', { error: errors.next, hint: true })}
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
      </Field>
      <Field id="repeat-password" label="Repeat new password" error={errors.repeat}>
        <PasswordInput
          id="repeat-password"
          autoComplete="new-password"
          invalid={Boolean(errors.repeat)}
          aria-describedby={describedBy('repeat-password', { error: errors.repeat })}
          value={repeat}
          onChange={(event) => setRepeat(event.target.value)}
        />
      </Field>
      <Button type="submit" loading={saving} loadingText="Changing password">
        Change password
      </Button>
    </form>
  );
}

export default function Account({ user, onSession }) {
  useDocumentTitle('Account');
  const role = ROLE_LABEL[user.role] || ROLE_LABEL.user;
  const RoleIcon = role.icon;

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-muted">
          <RoleIcon className="h-4 w-4" aria-hidden="true" />
          {role.label}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Account</h1>
        <p className="mt-3 text-lg text-ink-soft">Update your details and keep your sign-in secure.</p>
      </div>
      <div className="mt-10 grid max-w-5xl gap-6 lg:grid-cols-2 lg:items-start">
        <ProfileForm user={user} onSession={onSession} />
        <PasswordForm onSession={onSession} />
      </div>
    </div>
  );
}
