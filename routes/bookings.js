// routes/bookings.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/auth');
const { bookingRules, handleValidation } = require('../middleware/validate');

router.get('/new/:eventId', requireAuth, bookingController.getBookingForm);
router.post('/', requireAuth, bookingRules, handleValidation, bookingController.createBooking);
router.get('/:id/confirmation', requireAuth, bookingController.getConfirmation);
router.get('/:id', requireAuth, bookingController.getBookingDetail);
router.post('/:id/cancel', requireAuth, bookingController.cancelBooking);

module.exports = router;
