// controllers/dashboardController.js — User dashboard logic

const Booking = require('../models/Booking');
const Event = require('../models/Event');

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.session.user._id;

    const [bookings, upcomingEvents, stats] = await Promise.all([
      // All user bookings
      Booking.find({ user: userId })
        .populate('event', 'title date venue image slug status')
        .sort({ createdAt: -1 })
        .lean(),
      // Upcoming events to discover
      Event.find({ date: { $gte: new Date() }, status: { $ne: 'cancelled' } })
        .sort({ date: 1 })
        .limit(4)
        .lean(),
      // User booking stats
      Booking.aggregate([
        { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId.toString()) } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$totalPrice' },
            totalTickets: { $sum: '$quantity' },
            totalBookings: { $sum: 1 },
          },
        },
      ]),
    ]);

    const upcomingBookings = bookings.filter(
      b => b.event && new Date(b.event.date) >= new Date() && b.status === 'confirmed'
    );
    const pastBookings = bookings.filter(
      b => b.event && new Date(b.event.date) < new Date()
    );

    res.render('dashboard/index', {
      title: 'My Dashboard',
      bookings,
      upcomingBookings,
      pastBookings,
      upcomingEvents,
      userStats: stats[0] || { totalSpent: 0, totalTickets: 0, totalBookings: 0 },
    });
  } catch (err) {
    next(err);
  }
};
