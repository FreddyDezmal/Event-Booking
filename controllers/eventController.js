// controllers/eventController.js — Public event browsing logic

const Event = require('../models/Event');
const moment = require('moment');

// ── GET /events — Event listing with search & filter ──────────
exports.getEvents = async (req, res) => {
  try {
    const { q, category, date, availability, page = 1 } = req.query;
    const limit = 9;
    const skip = (parseInt(page) - 1) * limit;

    const filter = { status: { $ne: 'cancelled' } };

    // Text search
    if (q) {
      filter.$text = { $search: q };
    }

    // Category filter
    if (category && category !== 'All') {
      filter.category = category;
    }

    // Date filter
    if (date) {
      const now = new Date();
      if (date === 'today') {
        filter.date = { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() };
      } else if (date === 'this_week') {
        filter.date = { $gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate() };
      } else if (date === 'this_month') {
        filter.date = { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() };
      } else if (date === 'upcoming') {
        filter.date = { $gte: now };
      }
    } else {
      // Default: show upcoming events
      filter.date = { $gte: new Date() };
    }

    // Availability filter
    if (availability === 'available') {
      filter.ticketsRemaining = { $gt: 0 };
    }

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ date: 1 }).skip(skip).limit(limit).lean(),
      Event.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    const categories = ['All', 'Music', 'Sports', 'Technology', 'Business', 'Arts', 'Food & Drink', 'Health', 'Education', 'Community', 'Other'];

    res.render('events/index', {
      title: 'Browse Events',
      events,
      categories,
      currentPage: parseInt(page),
      totalPages,
      total,
      query: { q, category, date, availability },
    });
  } catch (err) {
    console.error('[EVENTS] List error:', err);
    next(err);
  }
};

// ── GET /events/:slug — Single event detail ───────────────────
exports.getEventDetail = async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug }).lean();
    if (!event) {
      return res.status(404).render('errors/404', { title: 'Event Not Found' });
    }

    // Related events (same category, excluding current)
    const related = await Event.find({
      category: event.category,
      _id: { $ne: event._id },
      date: { $gte: new Date() },
      status: { $ne: 'cancelled' },
    })
      .limit(3)
      .lean();

    res.render('events/detail', {
      title: event.title,
      event,
      related,
    });
  } catch (err) {
    next(err);
  }
};
