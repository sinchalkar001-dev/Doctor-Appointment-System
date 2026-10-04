const test = require('node:test');
const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const { toClient } = require('../services/appointments');

function appointment(overrides = {}) {
  return {
    _id: new Types.ObjectId(),
    user: new Types.ObjectId(),
    date: '2026-10-05',
    time: '09:00',
    status: 'pending',
    active: true,
    ...overrides,
  };
}

test('keeps a doctor that was not populated as its id', () => {
  const doctorId = new Types.ObjectId();
  const sent = JSON.parse(JSON.stringify(toClient(appointment({ doctor: doctorId }))));
  assert.equal(sent.doctor, doctorId.toHexString());
});

test('removes the account link from a populated doctor', () => {
  const doctor = { _id: new Types.ObjectId(), name: 'Dr. Asha Rao', specialization: 'Cardiology', user: new Types.ObjectId() };
  const sent = toClient(appointment({ doctor }));
  assert.equal(sent.doctor.name, 'Dr. Asha Rao');
  assert.equal('user' in sent.doctor, false);
});

test('keeps a removed doctor as null', () => {
  assert.equal(toClient(appointment({ doctor: null })).doctor, null);
});

test('drops the internal slot-holding flag', () => {
  assert.equal('active' in toClient(appointment({ doctor: null })), false);
});
