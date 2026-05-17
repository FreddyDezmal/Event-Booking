// controllers/contactController.js — Contact/Enquiry logic

const Enquiry = require('../models/Enquiry');

exports.getContact = (req, res) => {
  res.render('contact/index', { title: 'Contact Us' });
};

exports.postContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;
    await Enquiry.create({
      name,
      email,
      phone,
      subject,
      message,
      category: category || 'General',
      submittedBy: req.session.user?._id || null,
      ipAddress: req.ip,
    });
    req.flash('success', 'Your enquiry has been submitted. We\'ll be in touch within 24 hours.');
    res.redirect('/contact');
  } catch (err) {
    console.error('[CONTACT] Submit error:', err);
    req.flash('error', 'Failed to submit enquiry. Please try again.');
    res.redirect('/contact');
  }
};
