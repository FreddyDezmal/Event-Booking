// controllers/adminController.js — Admin panel logic

const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Enquiry = require('../models/Enquiry');
const upload = require('../middleware/upload');

// ── GET /admin/dashboard ──────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalEvents,
      totalBookings,
      totalEnquiries,
      newEnquiries,
      recentBookings,
      topEvents,
      revenueData,
      bookingsByMonth,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Event.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: 'new' }),
      Booking.find({ status: 'confirmed' })
        .populate('user', 'firstName lastName email')
        .populate('event', 'title date')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Event.find()
        .sort({ totalBookings: -1 })
        .limit(5)
        .lean(),
      // Total revenue from confirmed bookings
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      // Monthly booking counts for chart (last 6 months)
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) },
            status: 'confirmed',
          },
        },
        {
          $group: {
            _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$totalPrice' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const totalRevenue = revenueData[0]?.total || 0;

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      layout: 'layouts/admin',
      stats: { totalUsers, totalEvents, totalBookings, totalEnquiries, newEnquiries, totalRevenue },
      recentBookings,
      topEvents,
      bookingsByMonth: JSON.stringify(bookingsByMonth),
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/events ─────────────────────────────────────────
exports.getEvents = async (req, res, next) => {
  try {
    const { page = 1, status, category } = req.query;
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Event.countDocuments(filter),
    ]);

    res.render('admin/events/index', {
      title: 'Manage Events',
      layout: 'layouts/admin',
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      query: { status, category },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/events/new ─────────────────────────────────────
exports.getNewEvent = (req, res) => {
  const categories = ['Music', 'Sports', 'Technology', 'Business', 'Arts', 'Food & Drink', 'Health', 'Education', 'Community', 'Other'];
  res.render('admin/events/form', {
    title: 'Create Event',
    layout: 'layouts/admin',
    event: null,
    categories,
  });
};

// ── POST /admin/events ────────────────────────────────────────
exports.createEvent = async (req, res, next) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.session.user._id,
      ticketsRemaining: parseInt(req.body.ticketCapacity),
    };
    if (req.file) {
      eventData.image = req.file.path;
    }
    await Event.create(eventData);
    req.flash('success', 'Event created successfully!');
    res.redirect('/admin/events');
  } catch (err) {
    console.error('[ADMIN] Create event error:', err);
    req.flash('error', 'Failed to create event: ' + err.message);
    res.redirect('/admin/events/new');
  }
};

// ── GET /admin/events/:id/edit ────────────────────────────────
exports.getEditEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).render('errors/404', { title: 'Event Not Found' });
    const categories = ['Music', 'Sports', 'Technology', 'Business', 'Arts', 'Food & Drink', 'Health', 'Education', 'Community', 'Other'];
    res.render('admin/events/form', {
      title: 'Edit Event',
      layout: 'layouts/admin',
      event,
      categories,
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /admin/events/:id ─────────────────────────────────────
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).render('errors/404', { title: 'Event Not Found' });

    const updatedData = { ...req.body };
    if (req.file) updatedData.image = req.file.path;

    // Handle capacity change — adjust ticketsRemaining
    if (req.body.ticketCapacity && parseInt(req.body.ticketCapacity) !== event.ticketCapacity) {
      const diff = parseInt(req.body.ticketCapacity) - event.ticketCapacity;
      updatedData.ticketsRemaining = Math.max(0, event.ticketsRemaining + diff);
    }

    Object.assign(event, updatedData);
    await event.save();

    req.flash('success', 'Event updated successfully!');
    res.redirect('/admin/events');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /admin/events/:id ──────────────────────────────────
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found.');
      return res.redirect('/admin/events');
    }
    // Soft-delete: mark as cancelled rather than removing
    event.status = 'cancelled';
    await event.save();
    req.flash('success', 'Event has been cancelled/removed.');
    res.redirect('/admin/events');
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/bookings ───────────────────────────────────────
exports.getBookings = async (req, res, next) => {
  try {
    const { page = 1, status } = req.query;
    const limit = 15;
    const skip = (parseInt(page) - 1) * limit;
    const filter = {};
    if (status) filter.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'firstName lastName email')
        .populate('event', 'title date')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.render('admin/bookings', {
      title: 'Manage Bookings',
      layout: 'layouts/admin',
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      query: { status },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/users ──────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.render('admin/users', {
      title: 'Manage Users',
      layout: 'layouts/admin',
      users,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/enquiries ──────────────────────────────────────
exports.getEnquiries = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 }).lean();
    res.render('admin/enquiries', {
      title: 'Manage Enquiries',
      layout: 'layouts/admin',
      enquiries,
      filterStatus: status || 'all',
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /admin/enquiries/:id ────────────────────────────────
exports.updateEnquiry = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const update = { status, adminNotes };
    if (status === 'resolved') update.resolvedAt = new Date();
    await Enquiry.findByIdAndUpdate(req.params.id, update);
    req.flash('success', 'Enquiry updated.');
    res.redirect('/admin/enquiries');
  } catch (err) {
    next(err);
  }
};
