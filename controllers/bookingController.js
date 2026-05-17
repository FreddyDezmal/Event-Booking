// controllers/bookingController.js — Ticket booking logic

const Booking = require('../models/Booking');
const Event = require('../models/Event');
const QRCode = require('qrcode');

const getTicketsRemaining = (event) => {
  return Number(event.ticketCapacity || 0) -
         Number(event.totalBookings || 0);
};

// ── GET /bookings/new/:eventId — Booking form ─────────────────
exports.getBookingForm = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).lean();
    if (!event) return res.status(404).render('errors/404', { title: 'Event Not Found' });

    const remaining = getTicketsRemaining(event);

    if (remaining === 0) {
      req.flash('error', 'Sorry, this event is sold out.');
      return res.redirect(`/events/${event.slug}`);
    }

    res.render('bookings/new', {
      title: `Book Tickets — ${event.title}`,
      event,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /bookings — Create booking ───────────────────────────
exports.createBooking = async (req, res, next) => {
  // We use a session-based lock pattern. In production, use a MongoDB transaction.
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const { eventId, quantity, attendeeName, attendeeEmail, attendeePhone } = req.body;
    const qty = parseInt(quantity, 10);

    // ── Re-fetch event inside transaction to prevent race conditions ──
    const event = await Event.findById(eventId).session(session);
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });

    // ── Overbooking validation ────────────────────────────────
    const remaining = getTicketsRemaining(event);

    if (remaining < qty) {
      await session.abortTransaction();
      req.flash('error', `Only ${remaining} ticket(s) remaining. Please reduce your quantity.`);
      return res.redirect(`/bookings/new/${eventId}`);
    }

    if (event.status === 'cancelled') {
      await session.abortTransaction();
      req.flash('error', 'This event has been cancelled.');
      return res.redirect('/events');
    }

    const totalPrice = event.ticketPrice * qty;

    // ── Create booking ────────────────────────────────────────
    const [booking] = await Booking.create(
      [
        {
          user: req.session.user._id,
          event: event._id,
          quantity: qty,
          totalPrice,
          unitPrice: event.ticketPrice,
          attendeeName,
          attendeeEmail,
          attendeePhone,
          status: 'confirmed',
        },
      ],
      { session }
    );

    // ── Decrement available tickets ───────────────────────────
    const remainingAfter = getTicketsRemaining(event) - qty;

    if (remainingAfter === 0) {
      event.status = 'sold_out';
    }
    
    event.totalBookings += qty;
    event.totalRevenue += totalPrice;
    if (event.ticketsRemaining === 0) event.status = 'sold_out';
    await event.save({ session });

    // ── Generate QR Code ──────────────────────────────────────
    const qrData = JSON.stringify({
      ref: booking.bookingRef,
      event: event.title,
      qty,
      attendee: attendeeName,
    });
    const qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
    booking.qrCode = qrCode;
    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    req.flash('success', `Booking confirmed! Reference: ${booking.bookingRef}`);
    res.redirect(`/bookings/${booking._id}/confirmation`);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[BOOKING] Create error:', err);
    next(err);
  }
};

// ── GET /bookings/:id/confirmation ────────────────────────────
exports.getConfirmation = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event')
      .populate('user', 'firstName lastName email')
      .lean();

    if (!booking) return res.status(404).render('errors/404', { title: 'Booking Not Found' });

    // Security: ensure booking belongs to the logged-in user
    if (booking.user._id.toString() !== req.session.user._id.toString()) {
      req.flash('error', 'Access denied.');
      return res.redirect('/dashboard');
    }

    res.render('bookings/confirmation', {
      title: 'Booking Confirmed',
      booking,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /bookings/:id — Single booking detail ─────────────────
exports.getBookingDetail = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event')
      .populate('user', 'firstName lastName email')
      .lean();

    if (!booking) return res.status(404).render('errors/404', { title: 'Booking Not Found' });
    if (booking.user._id.toString() !== req.session.user._id.toString()) {
      req.flash('error', 'Access denied.');
      return res.redirect('/dashboard');
    }

    res.render('bookings/detail', { title: `Booking ${booking.bookingRef}`, booking });
  } catch (err) {
    next(err);
  }
};

// ── POST /bookings/:id/cancel — Cancel booking ────────────────
exports.cancelBooking = async (req, res, next) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  try {
    const booking = await Booking.findById(req.params.id).session(session);
    if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
    if (booking.user.toString() !== req.session.user._id.toString()) {
      await session.abortTransaction();
      req.flash('error', 'Access denied.');
      return res.redirect('/dashboard');
    }
    if (booking.status === 'cancelled') {
      await session.abortTransaction();
      req.flash('error', 'Booking is already cancelled.');
      return res.redirect('/dashboard');
    }

    const event = await Event.findById(booking.event).session(session);
    if (event) {
      event.totalBookings -= booking.quantity;
      event.totalBookings -= booking.quantity;
      event.totalRevenue -= booking.totalPrice;
      const remaining = getTicketsRemaining(event);

    if (event.status === 'sold_out' && remaining > 0) {
      event.status = 'active';
    }
      await event.save({ session });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledReason = req.body.reason || 'Cancelled by user';
    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    req.flash('success', 'Booking cancelled successfully.');
    res.redirect('/dashboard');
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};
