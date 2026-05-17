// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { eventRules, handleValidation } = require('../middleware/validate');
const upload = require('../middleware/upload');

// Apply auth to all admin routes
router.use(requireAuth, requireAdmin);

router.get('/dashboard', adminController.getDashboard);

// Events CRUD
router.get('/events', adminController.getEvents);
router.get('/events/new', adminController.getNewEvent);
router.post('/events', upload.single('image'), eventRules, handleValidation, adminController.createEvent);
router.get('/events/:id/edit', adminController.getEditEvent);
router.put('/events/:id', upload.single('image'), eventRules, handleValidation, adminController.updateEvent);
router.delete('/events/:id', adminController.deleteEvent);

// Bookings
router.get('/bookings', adminController.getBookings);

// Users
router.get('/users', adminController.getUsers);

// Enquiries
router.get('/enquiries', adminController.getEnquiries);
router.patch('/enquiries/:id', adminController.updateEnquiry);

module.exports = router;
