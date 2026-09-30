const test = require('node:test');
const assert = require('node:assert/strict');
const {
  checkBookable,
  describeDay,
  generateSlots,
  normalizeAvailability,
  validateAvailability,
} = require('../services/availability');

// 5 October 2026 is a Monday and 4 October 2026 a Sunday.
const MONDAY = '2026-10-05';
const SUNDAY = '2026-10-04';

const morning = {
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '12:00',
  breakStart: '10:00',
  breakEnd: '10:30',
  slotMinutes: 30,
};

test('builds slots inside working hours and skips the break', () => {
  assert.deepEqual(generateSlots(morning, MONDAY), ['09:00', '09:30', '10:30', '11:00', '11:30']);
});

test('has no slots on a day off', () => {
  assert.deepEqual(generateSlots(morning, SUNDAY), []);
});

test('never lets a slot run past closing time', () => {
  const hours = { ...morning, end: '11:00', breakStart: '', breakEnd: '', slotMinutes: 45 };
  assert.deepEqual(generateSlots(hours, MONDAY), ['09:00', '09:45']);
});

test('drops slots that would overlap the break', () => {
  const hours = { ...morning, breakStart: '10:15', breakEnd: '10:45', slotMinutes: 30 };
  assert.deepEqual(generateSlots(hours, MONDAY), ['09:00', '09:30', '11:00', '11:30']);
});

test('marks past, booked and open slots on the same day', () => {
  const now = new Date(2026, 9, 5, 9, 50);
  const day = describeDay({ availability: morning, dateKey: MONDAY, bookedTimes: ['11:00'], now });
  assert.deepEqual(
    day.slots.map((slot) => [slot.time, slot.status]),
    [
      ['09:00', 'past'],
      ['09:30', 'past'],
      ['10:30', 'open'],
      ['11:00', 'booked'],
      ['11:30', 'open'],
    ]
  );
  assert.equal(day.openCount, 2);
});

test('closes dates beyond the booking window', () => {
  const now = new Date(2026, 0, 1, 8, 0);
  const day = describeDay({ availability: morning, dateKey: MONDAY, now });
  assert.ok(day.slots.every((slot) => slot.status === 'closed'));
});

test('explains why a slot cannot be booked', () => {
  const now = new Date(2026, 9, 1, 8, 0);
  assert.equal(checkBookable({ availability: morning, dateKey: MONDAY, time: '09:30', now }), null);
  assert.equal(checkBookable({ availability: morning, dateKey: MONDAY, time: '11:00', bookedTimes: ['11:00'], now }).code, 409);
  assert.match(checkBookable({ availability: morning, dateKey: MONDAY, time: '10:00', now }).message, /isn’t one of/);
  assert.match(checkBookable({ availability: morning, dateKey: SUNDAY, time: '09:00', now }).message, /doesn’t see patients/);
  assert.match(checkBookable({ availability: morning, dateKey: '2026-02-30', time: '09:00', now }).message, /valid date/);
});

test('rejects availability that makes no sense', () => {
  assert.ok(validateAvailability({ days: [1], start: '12:00', end: '09:00', slotMinutes: 30 }).errors.length > 0);
  assert.ok(validateAvailability({ days: [1], start: '09:00', end: '12:00', slotMinutes: 25 }).errors.length > 0);
  assert.ok(validateAvailability({ ...morning, breakStart: '08:00', breakEnd: '08:30' }).errors.length > 0);
  assert.ok(validateAvailability({ ...morning, breakStart: '10:00', breakEnd: '' }).errors.length > 0);
  assert.deepEqual(validateAvailability(morning).errors, []);
});

test('fills missing availability with defaults', () => {
  const hours = normalizeAvailability(undefined);
  assert.deepEqual(hours.days, [1, 2, 3, 4, 5]);
  assert.equal(hours.slotMinutes, 30);
  assert.equal(hours.breakStart, '13:00');
});
