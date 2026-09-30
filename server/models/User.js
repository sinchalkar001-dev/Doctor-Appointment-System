const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { env } = require('../config/env');

// "user" is a patient. The name is kept so existing accounts keep working.
const ROLES = ['user', 'doctor', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Enter a name.'],
      trim: true,
      maxlength: [80, 'Use 80 characters or fewer for the name.'],
    },
    email: {
      type: String,
      required: [true, 'Enter an email address.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Enter a password.'],
      minlength: [6, 'Use at least 6 characters for the password.'],
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'user',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 30,
    },
    // Tokens issued before this moment stop working, so changing a password signs out other devices.
    passwordChangedAt: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.bcryptRounds);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(String(candidate || ''), this.password);
};

/** The fields the client is allowed to see. */
userSchema.methods.toPublic = function toPublic(extra = {}) {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone || '',
    createdAt: this.createdAt,
    ...extra,
  };
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
