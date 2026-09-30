import React, { useState } from 'react';
import { KeyRound, Mail, Phone, User } from 'lucide-react';
import { doctorAPI } from '../../api';
import AvailabilityEditor from '../../components/AvailabilityEditor';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import { Field, Input, PasswordInput, describedBy } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import { CURRENCY_SYMBOL } from '../../lib/format';
import { DEFAULT_AVAILABILITY, availabilityProblems } from '../../lib/schedule';

const FIELD_ORDER = ['name', 'specialization', 'fees', 'experience', 'accountEmail', 'accountPassword'];

function CurrencyGlyph({ className }) {
  return (
    <span className={cn(className, 'flex items-center justify-center text-base font-semibold')} aria-hidden="true">
      {CURRENCY_SYMBOL}
    </span>
  );
}

function initialValues(doctor) {
  return {
    name: doctor?.name || '',
    specialization: doctor?.specialization || '',
    fees: doctor?.fees ?? '',
    experience: doctor?.experience ?? '',
    phone: doctor?.phone || '',
    availability: { ...DEFAULT_AVAILABILITY, ...(doctor?.availability || {}) },
    accountEmail: '',
    accountPassword: '',
  };
}

function validate(values, needsAccountFields) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter the doctor’s name.';
  if (!values.specialization.trim()) errors.specialization = 'Enter a department or specialty.';
  if (values.fees === '' || Number.isNaN(Number(values.fees))) errors.fees = 'Enter the consultation fee.';
  else if (Number(values.fees) < 0) errors.fees = 'The fee can’t be negative.';
  if (values.experience !== '') {
    const years = Number(values.experience);
    if (Number.isNaN(years) || years < 0 || years > 70) errors.experience = 'Enter a number of years from 0 to 70.';
  }
  if (needsAccountFields && (values.accountEmail || values.accountPassword)) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.accountEmail.trim())) errors.accountEmail = 'Enter a valid email address.';
    if (values.accountPassword.length < 6) errors.accountPassword = 'Use at least 6 characters.';
  }
  const problems = availabilityProblems(values.availability);
  if (problems.length) errors.availability = problems[0];
  return errors;
}

function Section({ title, description, children }) {
  return (
    <section className="space-y-5 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-base font-bold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DoctorForm({ doctor, specialties, onCancel, onSaved }) {
  const [values, setValues] = useState(() => initialValues(doctor));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const hasAccount = Boolean(doctor?.account);

  const update = (key) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    const nextErrors = validate(values, !hasAccount);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key]);
    if (firstInvalid) {
      document.getElementById(`doctor-${firstInvalid}`)?.focus();
      return;
    }
    if (nextErrors.availability) return;

    const payload = {
      name: values.name.trim(),
      specialization: values.specialization.trim(),
      fees: Number(values.fees),
      experience: values.experience === '' ? 0 : Number(values.experience),
      phone: String(values.phone).trim(),
      availability: values.availability,
    };
    if (!hasAccount && values.accountEmail.trim()) {
      payload.account = { email: values.accountEmail.trim(), password: values.accountPassword };
    }

    setSaving(true);
    try {
      const response = doctor ? await doctorAPI.update(doctor._id, payload) : await doctorAPI.create(payload);
      if (response.data.success) {
        onSaved(response.data.doctor || payload, doctor ? 'edit' : 'create');
      } else {
        setSubmitError(response.data.message || 'The doctor could not be saved.');
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'The doctor could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-6">
        <Section title="Directory listing" description="What patients see on the doctor’s card.">
          <Field id="doctor-name" label="Name" error={errors.name}>
            <Input
              id="doctor-name"
              leadingIcon={User}
              placeholder="Dr. Priya Sharma"
              autoComplete="off"
              invalid={Boolean(errors.name)}
              aria-describedby={describedBy('doctor-name', { error: errors.name })}
              value={values.name}
              onChange={update('name')}
            />
          </Field>

          <Field
            id="doctor-specialization"
            label="Department"
            hint="Pick an existing department to keep the directory tidy, or type a new one."
            error={errors.specialization}
          >
            <Input
              id="doctor-specialization"
              list="specialty-options"
              placeholder="Cardiology"
              autoComplete="off"
              invalid={Boolean(errors.specialization)}
              aria-describedby={describedBy('doctor-specialization', { error: errors.specialization, hint: true })}
              value={values.specialization}
              onChange={update('specialization')}
            />
            <datalist id="specialty-options">
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty} />
              ))}
            </datalist>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="doctor-fees" label="Consultation fee" error={errors.fees}>
              <Input
                id="doctor-fees"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                leadingIcon={CurrencyGlyph}
                invalid={Boolean(errors.fees)}
                aria-describedby={describedBy('doctor-fees', { error: errors.fees })}
                value={values.fees}
                onChange={update('fees')}
              />
            </Field>
            <Field id="doctor-experience" label="Experience in years" optional error={errors.experience}>
              <Input
                id="doctor-experience"
                type="number"
                inputMode="numeric"
                min="0"
                max="70"
                step="1"
                invalid={Boolean(errors.experience)}
                aria-describedby={describedBy('doctor-experience', { error: errors.experience })}
                value={values.experience}
                onChange={update('experience')}
              />
            </Field>
          </div>

          <Field id="doctor-phone" label="Phone" optional>
            <Input
              id="doctor-phone"
              type="tel"
              leadingIcon={Phone}
              autoComplete="off"
              placeholder="+91 98765 43210"
              value={values.phone}
              onChange={update('phone')}
            />
          </Field>
        </Section>

        <Section title="Working hours" description="Patients can only book open times inside these hours.">
          <AvailabilityEditor
            value={values.availability}
            onChange={(availability) => {
              setValues((current) => ({ ...current, availability }));
              if (errors.availability) setErrors((current) => ({ ...current, availability: undefined }));
            }}
          />
        </Section>

        <Section
          title="Doctor portal sign-in"
          description={
            hasAccount
              ? 'This doctor can sign in to confirm appointments and set their own hours.'
              : 'Optional. Give the doctor a sign-in so they can confirm appointments and set their own hours.'
          }
        >
          {hasAccount ? (
            <p className="flex items-center gap-2.5 rounded-control border border-line bg-surface-muted px-4 py-3 text-[15px] text-ink-soft">
              <KeyRound className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
              Signs in as <span className="font-semibold text-ink">{doctor.account.email}</span>
            </p>
          ) : (
            <>
              <Field id="doctor-accountEmail" label="Sign-in email" optional error={errors.accountEmail}>
                <Input
                  id="doctor-accountEmail"
                  type="email"
                  leadingIcon={Mail}
                  autoComplete="off"
                  invalid={Boolean(errors.accountEmail)}
                  aria-describedby={describedBy('doctor-accountEmail', { error: errors.accountEmail })}
                  value={values.accountEmail}
                  onChange={update('accountEmail')}
                />
              </Field>
              <Field
                id="doctor-accountPassword"
                label="Temporary password"
                hint="Share it with the doctor privately. They can change it under Account settings."
                error={errors.accountPassword}
              >
                <PasswordInput
                  id="doctor-accountPassword"
                  autoComplete="new-password"
                  invalid={Boolean(errors.accountPassword)}
                  aria-describedby={describedBy('doctor-accountPassword', { error: errors.accountPassword, hint: true })}
                  value={values.accountPassword}
                  onChange={update('accountPassword')}
                />
              </Field>
            </>
          )}
        </Section>
      </div>

      <div className="shrink-0 space-y-3 border-t border-line bg-surface-muted px-5 py-4 sm:px-6">
        {submitError ? <Alert>{submitError}</Alert> : null}
        {errors.availability ? <Alert>{errors.availability}</Alert> : null}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving} className="flex-1">
            Close
          </Button>
          <Button type="submit" loading={saving} loadingText="Saving" className="flex-1">
            {doctor ? 'Save changes' : 'Add doctor'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function DoctorFormDialog({ open, doctor, specialties, onClose, onSaved }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={doctor ? 'Edit doctor' : 'Add a doctor'}
      description={
        doctor ? 'Changes show in the directory as soon as you save.' : 'The doctor appears in the directory as soon as you save.'
      }
      bodyClassName="flex min-h-0 flex-1 flex-col"
    >
      <DoctorForm key={doctor?._id || 'new'} doctor={doctor} specialties={specialties} onCancel={onClose} onSaved={onSaved} />
    </Dialog>
  );
}
