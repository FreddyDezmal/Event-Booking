// middleware/auth.js — Authentication & Authorization middleware

/**
 * requireAuth — Ensures user is logged in.
 * Redirects to /auth/login if not authenticated.
 */
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Please log in to access this page.');
  req.session.returnTo = req.originalUrl; // remember where they were going
  res.redirect('/auth/login');
};

/**
 * requireAdmin — Ensures user is an admin.
 * Must be used AFTER requireAuth.
 */
const requireAdmin = (req, res, next) => {
  if (req.session?.user?.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied. Admin privileges required.');
  res.redirect('/dashboard');
};

/**
 * redirectIfAuthenticated — Redirects logged-in users away from guest pages.
 * Used on login/register routes.
 */
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session?.user) {
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    return res.redirect(returnTo);
  }
  next();
};

/**
 * optionalAuth — Attaches user to req but doesn't block unauthenticated access.
 */
const optionalAuth = (req, res, next) => {
  // User is already in res.locals via server.js global middleware
  next();
};

module.exports = { requireAuth, requireAdmin, redirectIfAuthenticated, optionalAuth };
