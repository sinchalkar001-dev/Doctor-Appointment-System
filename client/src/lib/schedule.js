import { addDays, startOfToday } from 'date-fns';
import { formatTime, toDateKey } from './format';

/*
 * Client-side mirror of server/services/availability.js. The server stays the
 * source of truth for what can be booked; these helpers only drive the UI.
 */

/** Days shown in the quick date picker, starting today. */
export const QUICK_DAYS = 14;
/** How far ahead appointments can be booked (matches the API). */
export const BOOKING_WINDOW_DAYS = 90;
export const SLOT_LENGTHS = [15, 20, 30, 45, 60];

export const WEEKDAYS = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
];

export const DEFAULT_AVAILABILITY = {
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '17:00',
  breakStart: '13:00',
  breakEnd: '14:00',
  slotMinutes: 30,
};

export function upcomingDays(count = QUICK_DAYS) {
  const first = startOfToday();
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}

export function todayKey() {
  return toDateKey(startOfToday());
}

export function lastBookableKey() {
  return toDateKey(addDays(startOfToday(), BOOKING_WINDOW_DAYS));
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Problems with a working pattern, in plain words. Empty when it is valid. */
export function availabilityProblems(value) {
  const problems = [];
  if (!value.days.length) problems.push('Choose at least one working day.');
  if (!TIME.test(value.start) || !TIME.test(value.end)) problems.push('Set a start and end time.');
  else if (toMinutes(value.start) >= toMinutes(value.end)) problems.push('The day must end after it starts.');
  if (value.breakStart || value.breakEnd) {
    if (!TIME.test(value.breakStart) || !TIME.test(value.breakEnd)) problems.push('Set both a break start and end.');
    else if (toMinutes(value.breakStart) >= toMinutes(value.breakEnd)) problems.push('The break must end after it starts.');
    else if (
      TIME.test(value.start) &&
      TIME.test(value.end) &&
      (toMinutes(value.breakStart) < toMinutes(value.start) || toMinutes(value.breakEnd) > toMinutes(value.end))
    ) {
      problems.push('The break must fall inside working hours.');
    }
  }
  if (!problems.length && slotTimes(value).length === 0) problems.push('These hours leave no appointment slots.');
  return problems;
}

/** Appointment start times on a working day. */
export function slotTimes(value) {
  if (!TIME.test(value.start) || !TIME.test(value.end)) return [];
  const step = Number(value.slotMinutes) || 30;
  const open = toMinutes(value.start);
  const close = toMinutes(value.end);
  const hasBreak = TIME.test(value.breakStart || '') && TIME.test(value.breakEnd || '');
  const pauseFrom = hasBreak ? toMinutes(value.breakStart) : null;
  const pauseTo = hasBreak ? toMinutes(value.breakEnd) : null;
  const times = [];
  for (let minute = open; minute + step <= close; minute += step) {
    if (!(hasBreak && minute < pauseTo && minute + step > pauseFrom)) times.push(fromMinutes(minute));
  }
  return times;
}

function dayRanges(days) {
  const order = WEEKDAYS.map((day) => day.value).filter((value) => days.includes(value));
  if (order.length === 7) return 'Every day';
  const ranges = [];
  let run = [];
  WEEKDAYS.forEach((day) => {
    if (days.includes(day.value)) {
      run.push(day);
    } else if (run.length) {
      ranges.push(run);
      run = [];
    }
  });
  if (run.length) ranges.push(run);
  return ranges
    .map((group) => (group.length > 2 ? `${group[0].short} to ${group[group.length - 1].short}` : group.map((d) => d.short).join(', ')))
    .join(', ');
}

/** "Mon to Fri, 9:00 AM to 5:00 PM" style summary of a working pattern. */
export function describeAvailability(value) {
  if (!value || !value.days?.length) return 'No working days set';
  return `${dayRanges(value.days)}, ${formatTime(value.start)} to ${formatTime(value.end)}`;
}

/** Group slots into morning, afternoon and evening for display. */
export function groupSlots(slots) {
  const groups = [
    { id: 'morning', label: 'Morning', slots: [] },
    { id: 'afternoon', label: 'Afternoon', slots: [] },
    { id: 'evening', label: 'Evening', slots: [] },
  ];
  slots.forEach((slot) => {
    const minutes = toMinutes(slot.time);
    if (minutes < 12 * 60) groups[0].slots.push(slot);
    else if (minutes < 17 * 60) groups[1].slots.push(slot);
    else groups[2].slots.push(slot);
  });
  return groups.filter((group) => group.slots.length > 0);
}
