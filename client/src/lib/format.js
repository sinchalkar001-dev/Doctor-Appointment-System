import { differenceInCalendarDays, format, isValid } from 'date-fns';

export const CURRENCY_SYMBOL = '₹';

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME_KEY = /^(\d{1,2}):(\d{2})/;
const HONORIFIC = /^(dr|mr|mrs|ms|prof)\.?\s+/i;

/** Parse a stored `YYYY-MM-DD` value as a local calendar date, with no UTC shift. */
export function parseDateKey(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const match = DATE_KEY.exec(String(value));
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return isValid(parsed) ? parsed : null;
}

/** Format a Date as the `YYYY-MM-DD` key the API stores. */
export function toDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

export function formatDate(value, pattern = 'EEE, d MMM yyyy') {
  const date = parseDateKey(value);
  return date ? format(date, pattern) : 'Date not set';
}

/** `14:30` becomes `2:30 PM`. */
export function formatTime(value) {
  const match = TIME_KEY.exec(String(value || ''));
  if (!match) return value || 'Time not set';
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

/** Combine a stored date and time into one Date for sorting and comparisons. */
export function toDateTime(dateValue, timeValue) {
  const date = parseDateKey(dateValue);
  if (!date) return null;
  const result = new Date(date.getTime());
  const match = TIME_KEY.exec(String(timeValue || ''));
  if (match) {
    result.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    result.setHours(23, 59, 0, 0);
  }
  return result;
}

export function relativeDay(value, now = new Date()) {
  const date = parseDateKey(value);
  if (!date) return '';
  const days = differenceInCalendarDays(date, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function formatFee(value) {
  if (value === null || value === undefined || value === '') return 'Fee not listed';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Fee not listed';
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function initials(name = '') {
  const parts = String(name).replace(HONORIFIC, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}

export function firstName(name = '') {
  return String(name).replace(HONORIFIC, '').trim().split(/\s+/)[0] || '';
}

/** Sort key that ignores a leading "Dr." so doctors order by their own name. */
export function sortableName(name = '') {
  return String(name).replace(HONORIFIC, '').trim().toLowerCase();
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
