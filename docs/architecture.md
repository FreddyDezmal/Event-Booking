# Advanced Events — Architecture & Development Guide

## Project Structure

```
advanced-events/
├── server.js                     # Entry point — Express app bootstrap
├── package.json
├── .env.example                  # Environment variable template
│
├── config/
│   └── db.js                     # MongoDB connection via Mongoose
│
├── models/                       # Mongoose schemas (MVC: Model layer)
│   ├── User.js                   # Users — auth, roles, bcrypt
│   ├── Event.js                  # Events — full event data + slugs
│   ├── Booking.js                # Bookings — tickets, QR codes, refs
│   └── Enquiry.js                # Contact/enquiry submissions
│
├── controllers/                  # Business logic (MVC: Controller layer)
│   ├── authController.js         # Register, login, logout
│   ├── eventController.js        # Public event browse + detail
│   ├── bookingController.js      # Create/cancel bookings + QR gen
│   ├── dashboardController.js    # User dashboard aggregations
│   ├── adminController.js        # Full admin CRUD + analytics
│   └── contactController.js     # Enquiry form handling
│
├── routes/                       # Express route definitions
│   ├── index.js                  # / home route
│   ├── auth.js                   # /auth/*
│   ├── events.js                 # /events/*
│   ├── bookings.js               # /bookings/*
│   ├── dashboard.js              # /dashboard
│   ├── admin.js                  # /admin/* (protected)
│   └── contact.js                # /contact
│
├── middleware/
│   ├── auth.js                   # requireAuth, requireAdmin, redirectIfAuthenticated
│   ├── validate.js               # express-validator rule sets
│   └── upload.js                 # Multer image upload config
│
├── views/                        # EJS templates (MVC: View layer)
│   ├── layouts/
│   │   ├── main.ejs              # Public site layout (nav + footer)
│   │   ├── auth.ejs              # Split-panel auth layout
│   │   └── admin.ejs             # Dark sidebar admin layout
│   ├── partials/
│   │   ├── event-card.ejs        # Reusable event grid card
│   │   └── event-card-featured.ejs
│   ├── index.ejs                 # Home page
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── events/
│   │   ├── index.ejs             # Event listing + search/filter
│   │   └── detail.ejs            # Single event + booking sidebar
│   ├── bookings/
│   │   ├── new.ejs               # Ticket booking form
│   │   ├── confirmation.ejs      # Post-booking with QR code
│   │   └── detail.ejs            # Single booking view
│   ├── dashboard/
│   │   └── index.ejs             # User dashboard
│   ├── admin/
│   │   ├── dashboard.ejs         # Admin stats + charts
│   │   ├── bookings.ejs          # All bookings table
│   │   ├── users.ejs             # All users table
│   │   ├── enquiries.ejs         # Enquiry management
│   │   └── events/
│   │       ├── index.ejs         # Event list with CRUD actions
│   │       └── form.ejs          # Create/Edit event form
│   ├── contact/
│   │   └── index.ejs
│   └── errors/
│       ├── 404.ejs
│       └── 500.ejs
│
├── public/
│   ├── css/
│   │   ├── main.css              # Full design system (bespoke, no framework)
│   │   └── admin.css             # Admin panel styles
│   ├── js/
│   │   ├── main.js               # Frontend JS (theme, nav, animations)
│   │   └── admin.js              # Admin-specific JS (sidebar, charts)
│   ├── images/
│   │   └── default-event.jpg     # Fallback event image
│   └── uploads/
│       └── events/               # User-uploaded event images (Multer)
│
└── scripts/
    └── seed.js                   # Database seeder (admin + sample data)
```

---

## Database Schema Design

### Users Collection
```js
{
  firstName, lastName, email (unique), password (bcrypt hashed),
  phone, role: ['user', 'admin'], isActive, avatar,
  passwordResetToken, passwordResetExpires, lastLogin,
  createdAt, updatedAt
}
```
**Virtual:** `fullName`
**Methods:** `comparePassword(candidatePassword)`
**Index:** email (unique), role

### Events Collection
```js
{
  title, slug (unique, auto-generated), description, category,
  date, endDate, venue: { name, address, city, province },
  ticketCapacity, ticketsRemaining, ticketPrice,
  image, status: ['upcoming','active','sold_out','cancelled','completed'],
  featured, createdBy (ref: User), tags[],
  totalRevenue, totalBookings,
  createdAt, updatedAt
}
```
**Virtuals:** `isSoldOut`, `isPast`, `occupancyPercent`
**Indexes:** date, category, status, slug, text (title + description)

### Bookings Collection
```js
{
  bookingRef (unique, auto-generated: AE-XXXXX-XXXX),
  user (ref: User), event (ref: Event),
  quantity, totalPrice, unitPrice,
  status: ['confirmed','cancelled','pending','attended','refunded'],
  attendeeName, attendeeEmail, attendeePhone,
  qrCode (base64), checkedIn, checkedInAt,
  cancelledAt, cancelledReason, notes,
  createdAt, updatedAt
}
```
**Indexes:** user, event, bookingRef, status, createdAt (desc)

### Enquiries Collection
```js
{
  name, email, phone, subject, message,
  category: ['General','Booking','Technical','Refund','Partnership','Other'],
  status: ['new','in_progress','resolved','closed'],
  priority: ['low','medium','high','urgent'],
  submittedBy (ref: User, nullable), assignedTo (ref: User, nullable),
  adminNotes, resolvedAt, ipAddress,
  createdAt, updatedAt
}
```

---

## Authentication Flow

```
1. User visits /auth/register
2. POST /auth/register → validation → bcrypt hash → save User → session → redirect /dashboard
3. User visits /auth/login
4. POST /auth/login → findOne({email}).select('+password') → comparePassword()
         → session.user = { _id, firstName, lastName, email, role }
5. Protected routes → requireAuth middleware checks req.session.user
6. Admin routes → requireAdmin checks req.session.user.role === 'admin'
7. POST /auth/logout → req.session.destroy() → clearCookie → redirect /
```

---

## Overbooking Prevention (Critical Logic)

The booking controller uses **MongoDB transactions** to prevent race conditions:

```js
// In bookingController.createBooking:
const session = await mongoose.startSession();
session.startTransaction();

// 1. Re-fetch event inside transaction (prevents stale reads)
const event = await Event.findById(eventId).session(session);

// 2. Check remaining tickets INSIDE the transaction
if (event.ticketsRemaining < qty) {
  await session.abortTransaction();
  return res.redirect('back'); // show "only X tickets left" flash
}

// 3. Create booking
const [booking] = await Booking.create([{...}], { session });

// 4. Atomically decrement tickets
event.ticketsRemaining -= qty;
await event.save({ session });

// 5. Commit — if ANY step fails, entire transaction rolls back
await session.commitTransaction();
```

This ensures that two simultaneous bookings for the last ticket cannot both succeed.

---

## Security Implementation

| Threat | Mitigation |
|--------|-----------|
| XSS | Helmet CSP headers, EJS auto-escaping, express-validator `.escape()` |
| CSRF | SameSite cookie policy (`lax`) |
| Brute Force | express-rate-limit on `/auth/*` (20 req / 15 min) |
| Session Hijacking | `httpOnly: true`, `secure: true` (prod), `SESSION_SECRET` env var |
| Password Exposure | `select: false` on password field, bcrypt cost factor 12 |
| SQL Injection | N/A (MongoDB + Mongoose), parameterized queries |
| Privilege Escalation | requireAuth → requireAdmin middleware chain |
| File Upload | Multer type/size validation, files stored in `/public/uploads` (not exec dir) |
| Mass Assignment | Controllers explicitly pick allowed fields |

---

## Development Roadmap

### Phase 1 — Foundation (Week 1)
- [x] Project scaffold, Express setup, MongoDB connection
- [x] User model + bcrypt authentication
- [x] Session management, flash messages
- [x] Basic routing structure (auth, events, bookings)

### Phase 2 — Core Features (Week 2)
- [x] Event model + CRUD (admin only)
- [x] Public event listing with search & filter
- [x] Event detail page
- [x] Booking system with overbooking prevention
- [x] QR code generation

### Phase 3 — Dashboards (Week 3)
- [x] User dashboard (bookings history, stats)
- [x] Admin dashboard (charts, analytics, recent activity)
- [x] Enquiry system (submit + admin management)
- [x] Pagination

### Phase 4 — Polish & Advanced (Week 4)
- [ ] Email confirmations via nodemailer
- [ ] PDF ticket download via pdfkit
- [ ] Password reset flow (token-based)
- [ ] Event image optimisation (sharp)
- [ ] Admin event bulk actions
- [ ] User profile edit page

---

## Deployment Recommendations

### Environment
- **Node version**: 18 LTS minimum
- **MongoDB**: Atlas M0 (free) → M10+ for production
- **Hosting**: Railway, Render, or Heroku (easiest); DigitalOcean App Platform for more control
- **Static assets**: Serve via nginx or CDN (Cloudflare)

### Production Checklist
```bash
# .env for production
NODE_ENV=production
SESSION_SECRET=<strong-64-char-random-string>
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/advanced_events
```

- Enable HTTPS (Let's Encrypt)
- Set `cookie.secure = true` (already conditional on NODE_ENV)
- Configure proper CORS if using separate frontend
- Set up MongoDB Atlas IP whitelist
- Enable MongoDB backups
- Add process manager: `pm2 start server.js --name advanced-events`

### Railway Deployment
```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Initial commit"
gh repo create advanced-events --public

# 2. Connect Railway to GitHub repo
# 3. Add environment variables in Railway dashboard
# 4. Add MongoDB Atlas connection string
# railway up (if using Railway CLI)
```

---

## GitHub Workflow

### Commit Convention
```
feat: add QR code generation to bookings
fix: prevent overbooking in concurrent requests
refactor: extract event filtering to service layer
style: improve mobile responsiveness of event cards
docs: add API documentation
chore: update dependencies
```

### Branch Strategy
```
main          ← production-ready
develop       ← integration branch
feature/xyz   ← individual features
hotfix/xyz    ← production bug fixes
```

### .gitignore
```
node_modules/
.env
public/uploads/events/
*.log
.DS_Store
```

---

## Key Implementation Decisions

1. **express-ejs-layouts** — Provides a layout wrapper system avoiding repeated HTML boilerplate in every view.

2. **MongoDB Transactions for bookings** — `session.startTransaction()` ensures atomicity when decrementing ticket count and creating booking record simultaneously, preventing race conditions.

3. **`select: false` on password** — The password hash is never returned in queries unless explicitly requested with `.select('+password')`, preventing accidental exposure in API responses or template rendering.

4. **Method Override middleware** — Allows HTML forms to send PUT/DELETE requests via `?_method=PUT` query param, since HTML forms only support GET/POST.

5. **Slugs for event URLs** — SEO-friendly `/events/joburg-jazz-festival-1234567` instead of `/events/64abc123def`. Auto-generated in pre-save hook.

6. **QR code as base64** — Stored directly in MongoDB as a data URL string. For production with many bookings, store as a file reference in S3/Cloudinary instead.

7. **Soft delete for events** — Setting `status: 'cancelled'` instead of `Event.deleteOne()` preserves booking history integrity and audit trail.

8. **Connect-mongo session store** — Sessions persisted in MongoDB instead of in-memory (MemoryStore), which doesn't survive server restarts and leaks memory in production.
