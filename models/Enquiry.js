// models/Enquiry.js — Contact/Enquiry schema

const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: ['General', 'Booking', 'Technical', 'Refund', 'Partnership', 'Other'],
      default: 'General',
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'closed'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // can be a guest
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminNotes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    resolvedAt: Date,
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────
enquirySchema.index({ status: 1 });
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ email: 1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
