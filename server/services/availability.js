/*
 * Scheduling rules. Pure functions with no database access, so they are easy
 * to test (see tests/availability.test.js) and shared by models and routes.
 *
 * Dates are `YYYY-MM-DD` keys and times are `HH:mm`, interpreted in the
 * server's local timezone, which is how appointments have always been stored.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_LENGTHS = [15, 20, 30, 45, 60];
const BOOKING_WINDOW_DAYS = 90;
const LEAD_MINUTES = 15;

const DEFAULT_AVAILABILITY = Object.freeze({
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '17:00',
  breakStart: '13:00',
  breakEnd: '14:00',
  slotMinutes: 30,
});

function isValidTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseDateKey(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const matches = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return matches ? date : null;
}

function isValidDateKey(value) {
  return parseDateKey(value) !== null;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + amount);
  return next;
}

/** Combine a date key and time into a local Date. */
function toDateTime(dateKey, time) {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  if (isValidTime(time)) {
    const minutes = toMinutes(time);
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  }
  return date;
}

/** Fill gaps with defaults and drop anything malformed, so slot maths never breaks. */
function normalizeAvailability(input) {
  const source = input && typeof input.toObject === 'function' ? input.toObject() : input || {};

  const days = Array.isArray(source.days)
    ? [...new Set(source.days.map(Number))].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort((a, b) => a - b)
    : [...DEFAULT_AVAILABILITY.days];

  let start = isValidTime(source.start) ? source.start : DEFAULT_AVAILABILITY.start;
  let end = isValidTime(source.end) ? source.end : DEFAULT_AVAILABILITY.end;
  if (toMinutes(start) >= toMinutes(end)) {
    start = DEFAULT_AVAILABILITY.start;
    end = DEFAULT_AVAILABILITY.end;
  }

  const slotMinutes = SLOT_LENGTHS.includes(Number(source.slotMinutes))
    ? Number(source.slotMinutes)
    : DEFAULT_AVAILABILITY.slotMinutes;

  const breakMissing = source.breakStart === undefined && source.breakEnd === undefined;
  const breakStart = breakMissing ? DEFAULT_AVAILABILITY.breakStart : source.breakStart;
  const breakEnd = breakMissing ? DEFAULT_AVAILABILITY.breakEnd : source.breakEnd;
  const breakValid =
    isValidTime(breakStart) &&
    isValidTime(breakEnd) &&
    toMinutes(breakStart) < toMinutes(breakEnd) &&
    toMinutes(breakStart) >= toMinutes(start) &&
    toMinutes(breakEnd) <= toMinutes(end);

  return {
    days,
    start,
    end,
    slotMinutes,
    breakStart: breakValid ? breakStart : '',
    breakEnd: breakValid ? breakEnd : '',
  };
}

/** Appointment start times on a working day. A slot never overlaps the break or runs past closing. */
function slotTimes(availability) {
  const hours = normalizeAvailability(availability);
  const open = toMinutes(hours.start);
  const close = toMinutes(hours.end);
  const step = hours.slotMinutes;
  const pauseFrom = hours.breakStart ? toMinutes(hours.breakStart) : null;
  const pauseTo = hours.breakEnd ? toMinutes(hours.breakEnd) : null;

  const times = [];
  for (let minute = open; minute + step <= close; minute += step) {
    const overlapsBreak = pauseFrom !== null && minute < pauseTo && minute + step > pauseFrom;
    if (!overlapsBreak) times.push(fromMinutes(minute));
  }
  return times;
}

function generateSlots(availability, dateKey) {
  const hours = normalizeAvailability(availability);
  const date = parseDateKey(dateKey);
  if (!date || !hours.days.includes(date.getDay())) return [];
  return slotTimes(hours);
}

/** Every slot on a day with its state: open, booked, past, or beyond the booking window. */
function describeDay({ availability, dateKey, bookedTimes = [], now = new Date() }) {
  const hours = normalizeAvailability(availability);
  const date = parseDateKey(dateKey);
  const workingDay = Boolean(date) && hours.days.includes(date.getDay());
  const booked = new Set(bookedTimes);
  const todayKey = toDateKey(now);
  const lastBookableKey = toDateKey(addDays(now, BOOKING_WINDOW_DAYS));
  const cutoff = now.getHours() * 60 + now.getMinutes() + LEAD_MINUTES;

  const slots = (workingDay ? slotTimes(hours) : []).map((time) => {
    let status = 'open';
    if (dateKey < todayKey || (dateKey === todayKey && toMinutes(time) < cutoff)) status = 'past';
    else if (dateKey > lastBookableKey) status = 'closed';
    else if (booked.has(time)) status = 'booked';
    return { time, status };
  });

  return {
    date: dateKey,
    workingDay,
    slots,
    openCount: slots.filter((slot) => slot.status === 'open').length,
  };
}

/**
 * Explain why a slot can't be booked, or return null when it can.
 * `code` maps to the HTTP status the API answers with.
 */
function checkBookable({ availability, dateKey, time, bookedTimes = [], now = new Date() }) {
  if (!isValidDateKey(dateKey)) return { code: 400, message: 'Choose a valid date.' };
  if (!isValidTime(time)) return { code: 400, message: 'Choose a valid time.' };

  const day = describeDay({ availability, dateKey, bookedTimes, now });
  if (!day.workingDay) return { code: 400, message: 'The doctor doesn’t see patients on this day. Choose another date.' };

  const slot = day.slots.find((item) => item.time === time);
  if (!slot) return { code: 400, message: 'That time isn’t one of the doctor’s appointment slots. Choose another time.' };
  if (slot.status === 'past') return { code: 400, message: 'That time has already passed. Choose a later time.' };
  if (slot.status === 'closed') {
    return { code: 400, message: `Appointments can be booked up to ${BOOKING_WINDOW_DAYS} days ahead.` };
  }
  if (slot.status === 'booked') return { code: 409, message: 'That time is already taken. Choose another time.' };
  return null;
}

/** Validate availability sent by a doctor or admin. Returns the first problems found. */
function validateAvailability(input) {
  const errors = [];
  if (!input || typeof input !== 'object') return { errors: ['Send working days and hours.'], value: null };

  const days = input.days;
  if (!Array.isArray(days) || days.some((day) => !Number.isInteger(Number(day)) || day < 0 || day > 6)) {
    errors.push('Choose working days from Sunday (0) to Saturday (6).');
  }

  if (!isValidTime(input.start) || !isValidTime(input.end)) {
    errors.push('Use HH:mm for working hours.');
  } else if (toMinutes(input.start) >= toMinutes(input.end)) {
    errors.push('The working day must end after it starts.');
  }

  if (!SLOT_LENGTHS.includes(Number(input.slotMinutes))) {
    errors.push(`Choose a slot length of ${SLOT_LENGTHS.join(', ')} minutes.`);
  }

  const hasBreakStart = Boolean(input.breakStart);
  const hasBreakEnd = Boolean(input.breakEnd);
  if (hasBreakStart !== hasBreakEnd) {
    errors.push('Set both a break start and end, or leave both empty.');
  } else if (hasBreakStart) {
    if (!isValidTime(input.breakStart) || !isValidTime(input.breakEnd)) {
      errors.push('Use HH:mm for the break.');
    } else if (toMinutes(input.breakStart) >= toMinutes(input.breakEnd)) {
      errors.push('The break must end after it starts.');
    } else if (
      isValidTime(input.start) &&
      isValidTime(input.end) &&
      (toMinutes(input.breakStart) < toMinutes(input.start) || toMinutes(input.breakEnd) > toMinutes(input.end))
    ) {
      errors.push('The break must fall inside working hours.');
    }
  }

  if (errors.length === 0) {
    const value = normalizeAvailability(input);
    if (value.days.length > 0 && slotTimes(value).length === 0) {
      errors.push('These hours leave no appointment slots. Lengthen the day or shorten the slots.');
    }
    if (errors.length === 0) return { errors, value };
  }
  return { errors, value: null };
}

module.exports = {
  TIME_PATTERN,
  DATE_PATTERN,
  SLOT_LENGTHS,
  BOOKING_WINDOW_DAYS,
  LEAD_MINUTES,
  DEFAULT_AVAILABILITY,
  isValidTime,
  isValidDateKey,
  parseDateKey,
  toDateKey,
  addDays,
  toDateTime,
  toMinutes,
  fromMinutes,
  normalizeAvailability,
  slotTimes,
  generateSlots,
  describeDay,
  checkBookable,
  validateAvailability,
};
