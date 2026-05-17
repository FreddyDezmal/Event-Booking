// routes/index.js — Public home route
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

router.get('/', async (req, res, next) => {
  try {
    const [featuredEvents, upcomingEvents] = await Promise.all([
      Event.find({ featured: true, date: { $gte: new Date() }, status: { $ne: 'cancelled' } }).limit(3).lean(),
      Event.find({ date: { $gte: new Date() }, status: { $ne: 'cancelled' } }).sort({ date: 1 }).limit(6).lean(),
    ]);
    res.render('index', { title: 'Home', featuredEvents, upcomingEvents });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
