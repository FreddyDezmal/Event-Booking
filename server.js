// ============================================================
// server.js — Application Entry Point
// Advanced Events (Pty) Ltd
// ============================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// ── Database ─────────────────────────────────────────────────
require('./config/db');

// ── Security Middleware ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

// Rate limiting — auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Core Middleware ───────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy', 1); // trust first proxy for secure cookies behind proxies/load balancers

// ── Session ───────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_dev',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600, // only update session once per day unless data changes
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24h
  },
  proxy: true, // trust first proxy (for secure cookies behind proxies/load balancers)
}));
app.set('trust proxy', 1);

app.use(flash());

// ── View Engine ───────────────────────────────────────────────
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// ── Global Template Locals ────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.user?.role === 'admin';
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.appName = process.env.APP_NAME || 'Advanced Events';
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/bookings', require('./routes/bookings'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/admin', require('./routes/admin'));
app.use('/contact', require('./routes/contact'));

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('errors/404', { layout: 'layouts/main', title: 'Page Not Found' });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  const status = err.status || 500;
  res.status(status).render('errors/500', {
    layout: 'layouts/main',
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
  });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Advanced Events running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
