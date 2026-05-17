// middleware/validate.js — Input validation rules

const { body, validationResult } = require('express-validator');

// ── Collect validation errors ─────────────────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(' | '));
    return res.redirect('back');
  }
  next();
};

// ── Auth Validators ───────────────────────────────────────────
const registerRules = [
  body('firstName').trim().notEmpty().withMessage('First name is required').escape(),
  body('lastName').trim().notEmpty().withMessage('Last name is required').escape(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Event Validators ──────────────────────────────────────────
const eventRules = [
  body('title').trim().notEmpty().withMessage('Title is required').escape(),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('venue.name').trim().notEmpty().withMessage('Venue name is required').escape(),
  body('venue.address').trim().notEmpty().withMessage('Venue address is required').escape(),
  body('venue.city').trim().notEmpty().withMessage('City is required').escape(),
  body('ticketCapacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('ticketPrice').isFloat({ min: 0 }).withMessage('Price must be 0 or more'),
];

// ── Booking Validator ─────────────────────────────────────────
const bookingRules = [
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10'),
  body('attendeeName').trim().notEmpty().withMessage('Attendee name is required').escape(),
  body('attendeeEmail').isEmail().withMessage('Valid attendee email required').normalizeEmail(),
];

// ── Enquiry Validator ─────────────────────────────────────────
const enquiryRules = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required').escape(),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  body('category').optional().isIn(['General', 'Booking', 'Technical', 'Refund', 'Partnership', 'Other']),
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  eventRules,
  bookingRules,
  enquiryRules,
};
