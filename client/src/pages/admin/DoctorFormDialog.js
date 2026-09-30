import React, { useState } from 'react';
import { Phone, User } from 'lucide-react';
import { doctorAPI } from '../../api';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import { Field, Input, describedBy } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import { CURRENCY_SYMBOL } from '../../lib/format';

const EMPTY = { name: '', specialization: '', fees: '', experience: '', phone: '' };
const FIELD_ORDER = ['name', 'specialization', 'fees', 'experience'];

function CurrencyGlyph({ className }) {
  return (
    <span className={cn(className, 'flex items-center justify-center text-base font-semibold')} aria-hidden="true">
      {CURRENCY_SYMBOL}
    </span>
  );
}

function initialValues(doctor) {
  if (!doctor) return EMPTY;
  return {
    name: doctor.name || '',
    specialization: doctor.specialization || '',
    fees: doctor.fees ?? '',
    experience: doctor.experience ?? '',
    phone: doctor.phone || '',
  };
}

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter the doctor’s name.';
  if (!values.specialization.trim()) errors.specialization = 'Enter a department or specialty.';
  if (values.fees === '' || Number.isNaN(Number(values.fees))) errors.fees = 'Enter the consultation fee.';
  else if (Number(values.fees) < 0) errors.fees = 'The fee can’t be negative.';
  if (values.experience !== '') {
    const years = Number(values.experience);
    if (Number.isNaN(years) || years < 0 || years > 70) errors.experience = 'Enter a number of years from 0 to 70.';
  }
  return errors;
}

function DoctorForm({ doctor, specialties, onCancel, onSaved }) {
  const [values, setValues] = useState(() => initialValues(doctor));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const update = (key) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    const nextErrors = validate(values);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key]);
    if (firstInvalid) {
      document.getElementById(`doctor-${firstInvalid}`)?.focus();
      return;
    }

    const payload = {
      name: values.name.trim(),
      specialization: values.specialization.trim(),
      fees: Number(values.fees),
      experience: values.experience === '' ? 0 : Number(values.experience),
      phone: String(values.phone).trim(),
    };

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
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-6">
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
      </div>

      <div className="shrink-0 space-y-3 border-t border-line bg-surface-muted px-5 py-4 sm:px-6">
        {submitError ? <Alert>{submitError}</Alert> : null}
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
        doctor
          ? 'Changes show in the directory as soon as you save.'
          : 'The doctor appears in the directory as soon as you save.'
      }
      bodyClassName="flex min-h-0 flex-1 flex-col"
    >
      <DoctorForm
        key={doctor?._id || 'new'}
        doctor={doctor}
        specialties={specialties}
        onCancel={onClose}
        onSaved={onSaved}
      />
    </Dialog>
  );
}
