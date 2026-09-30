const Appointment = require('../models/Appointment');
const HttpError = require('../utils/httpError');
const realtime = require('./realtime');
const { checkBookable, toDateTime } = require('./availability');

const DOCTOR_FIELDS = 'name specialization fees phone availability user';
const PATIENT_FIELDS = 'name email phone';

// Which status can follow which. Completed and cancelled are final.
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const VERBS = {
  confirmed: 'confirmed',
  completed: 'marked completed',
  cancelled: 'cancelled',
};

async function takenTimes(doctorId, dateKey, excludeId) {
  const query = { doctor: doctorId, date: dateKey, status: { $in: Appointment.ACTIVE_STATUSES } };
  if (excludeId) query._id = { $ne: excludeId };
  const rows = await Appointment.find(query).select('time').lean();
  return rows.map((row) => row.time);
}

/** Throw a clear HttpError unless the doctor has this slot open and the patient is free. */
async function assertSlotAvailable({ doctor, date, time, patientId, excludeId }) {
  const problem = checkBookable({
    availability: doctor.availability,
    dateKey: date,
    time,
    bookedTimes: await takenTimes(doctor._id, date, excludeId),
  });
  if (problem) throw new HttpError(problem.code, problem.message);

  if (patientId) {
    const clash = await Appointment.exists({
      user: patientId,
      date,
      time,
      status: { $in: Appointment.ACTIVE_STATUSES },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (clash) throw new HttpError(409, 'You already have another appointment at this time. Choose a different time.');
  }
}

/** Move an appointment to a new status, enforcing the allowed transitions. */
function applyStatusChange(appointment, nextStatus, { by, reason, note, now = new Date() } = {}) {
  const allowed = TRANSITIONS[appointment.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(400, `A ${appointment.status} appointment can’t be ${VERBS[nextStatus] || nextStatus}.`);
  }
  if (nextStatus === 'completed') {
    const start = toDateTime(appointment.date, appointment.time);
    if (start && start > now) {
      throw new HttpError(400, 'A visit can be marked completed once its start time has passed.');
    }
  }

  appointment.status = nextStatus;
  if (nextStatus === 'cancelled') {
    appointment.cancelledBy = by;
    appointment.cancelReason = String(reason || '').trim().slice(0, 300);
  }
  if (typeof note === 'string') appointment.doctorNote = note.trim().slice(0, 1000);
  return appointment;
}

function populateParties(appointment) {
  return appointment.populate([
    { path: 'doctor', select: DOCTOR_FIELDS },
    { path: 'user', select: PATIENT_FIELDS },
  ]);
}

/** Plain object for API responses: internal flags and the doctor's account id stay on the server. */
function toClient(appointment) {
  const plain = typeof appointment.toObject === 'function' ? appointment.toObject() : { ...appointment };
  if (plain.doctor && typeof plain.doctor === 'object') {
    const doctor = { ...plain.doctor };
    delete doctor.user;
    plain.doctor = doctor;
  }
  delete plain.active;
  return plain;
}

function eventSummary(appointment) {
  const { doctor, user } = appointment;
  return {
    _id: appointment._id,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status,
    cancelledBy: appointment.cancelledBy || null,
    doctor: doctor && doctor._id ? { _id: doctor._id, name: doctor.name, specialization: doctor.specialization } : doctor,
    user: user && user._id ? { _id: user._id, name: user.name } : user,
  };
}

/**
 * Push an appointment change to the patient, the doctor and all admins, and
 * tell every connected client that the doctor's slots on those dates changed.
 */
function broadcastAppointment(appointment, action, actor, { extraDates = [] } = {}) {
  const doctor = appointment.doctor || {};
  const doctorId = String(doctor._id || doctor);
  const patientId = appointment.user?._id || appointment.user;

  realtime.publish({ userIds: [patientId, doctor.user], roles: ['admin'] }, 'appointment', {
    action,
    actor: actor ? { id: String(actor._id), role: actor.role, name: actor.name } : null,
    appointment: eventSummary(appointment),
  });

  new Set([appointment.date, ...extraDates].filter(Boolean)).forEach((date) => {
    realtime.publish({ everyone: true }, 'slots', { doctorId, date });
  });
}

module.exports = {
  DOCTOR_FIELDS,
  PATIENT_FIELDS,
  TRANSITIONS,
  takenTimes,
  assertSlotAvailable,
  applyStatusChange,
  populateParties,
  toClient,
  broadcastAppointment,
};
