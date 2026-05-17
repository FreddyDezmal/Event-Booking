// models/Event.js — Event schema

const mongoose = require('mongoose');
const slugify = require('slugify');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Music', 'Sports', 'Technology', 'Business', 'Arts', 'Food & Drink', 'Health', 'Education', 'Community', 'Other'],
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    endDate: {
      type: Date,
    },
    venue: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      province: { type: String, default: 'Gauteng' },
    },
    ticketCapacity: {
      type: Number,
      required: [true, 'Ticket capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    
    ticketPrice: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      default: '/images/default-event.jpg',
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'sold_out', 'cancelled', 'completed'],
      default: 'upcoming',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [String],
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──────────────────────────────────────────────────
eventSchema.virtual('isSoldOut').get(function () {
  return this.ticketsRemaining === 0;
});

eventSchema.virtual('isPast').get(function () {
  return new Date(this.date) < new Date();
});

eventSchema.virtual('occupancyPercent').get(function () {
  if (!this.ticketCapacity) return 0;
  return Math.round(((this.ticketCapacity - this.ticketsRemaining) / this.ticketCapacity) * 100);
});

eventSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'event',
});

// ── Pre-save: generate slug & sync ticketsRemaining ───────────
eventSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  if (this.isNew && this.ticketsRemaining === undefined) {
    this.ticketsRemaining = this.ticketCapacity;
  }
  // Auto status management
  if (this.ticketsRemaining === 0) this.status = 'sold_out';
  next();
});

// ── Indexes ───────────────────────────────────────────────────
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ slug: 1 });
eventSchema.index({ title: 'text', description: 'text' }); // Full-text search

module.exports = mongoose.model('Event', eventSchema);
