// controllers/authController.js — Authentication logic

const User = require('../models/User');

// ── GET /auth/register ────────────────────────────────────────
exports.getRegister = (req, res) => {
  res.render('auth/register', { title: 'Create Account', layout: 'layouts/auth' });
};

// ── POST /auth/register ───────────────────────────────────────
exports.postRegister = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error', 'An account with that email already exists.');
      return res.redirect('/auth/register');
    }

    const user = await User.create({ firstName, lastName, email, password, phone });

    // Auto-login after registration
    req.session.user = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };

    req.flash('success', `Welcome, ${user.firstName}! Your account has been created.`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/auth/register');
  }
};

// ── GET /auth/login ───────────────────────────────────────────
exports.getLogin = (req, res) => {
  res.render('auth/login', { title: 'Sign In', layout: 'layouts/auth' });
};

// ── POST /auth/login ──────────────────────────────────────────
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // select: false on password, so we must explicitly select it
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/auth/login');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/auth/login');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    req.session.user = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };

    req.flash('success', `Welcome back, ${user.firstName}!`);
    const returnTo = req.session.returnTo || (user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/auth/login');
  }
};

// ── POST /auth/logout ─────────────────────────────────────────
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('[AUTH] Logout error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};
