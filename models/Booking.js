// models/Booking.js — Booking schema

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Minimum 1 ticket'],
      max: [10, 'Maximum 10 tickets per booking'],
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'pending', 'attended', 'refunded'],
      default: 'confirmed',
    },
    attendeeName: {
      type: String,
      required: true,
    },
    attendeeEmail: {
      type: String,
      required: true,
    },
    attendeePhone: String,
    qrCode: {
      type: String, // base64 QR code image
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: Date,
    notes: String,
    cancelledAt: Date,
    cancelledReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Pre-save: generate booking reference ──────────────────────
bookingSchema.pre('save', async function (next) {
  if (this.isNew && !this.bookingRef) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingRef = `AE-${timestamp}-${random}`;
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────
bookingSchema.index({ user: 1 });
bookingSchema.index({ event: 1 });
bookingSchema.index({ bookingRef: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
