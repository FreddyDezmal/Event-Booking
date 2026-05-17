// scripts/seed.js — Seed admin user and sample events

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Enquiry = require('../models/Enquiry');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/advanced_events';

const sampleEvents = [
  {
    title: 'Joburg Jazz & Blues Festival 2025',
    slug: 'joburg-jazz-blues-festival-2025',
    description: 'Experience the finest jazz and blues music under the Johannesburg stars. Featuring world-class local and international artists across three stages, craft food vendors, and an unforgettable atmosphere.',
    category: 'Music',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    venue: { name: 'Marks Park Sports Club', address: '10 Emmarentia Ave', city: 'Johannesburg', province: 'Gauteng' },
    ticketCapacity: 2000,
    ticketPrice: 350,
    status: 'upcoming',
    featured: true,
    tags: ['jazz', 'blues', 'live music', 'johannesburg'],
  },
  {
    title: 'Tech Summit Africa 2025',
    slug: 'tech-summit-africa-2025',
    description: "South Africa's premier technology conference. Join 3,000+ tech professionals, startup founders, and innovators for two days of keynotes, workshops, and networking.",
    category: 'Technology',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    venue: { name: 'Sandton Convention Centre', address: '161 Maude St', city: 'Sandton', province: 'Gauteng' },
    ticketCapacity: 3000,
    ticketPrice: 1500,
    status: 'upcoming',
    featured: true,
    tags: ['tech', 'startups', 'AI', 'networking'],
  },
  {
    title: 'Cape Town Food & Wine Expo',
    slug: 'cape-town-food-wine-expo',
    description: 'A celebration of South African culinary excellence. Sample wines from the Cape Winelands, gourmet street food from top chefs, and watch live cooking demonstrations.',
    category: 'Food & Drink',
    date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    venue: { name: 'CTICC', address: 'Convention Square, 1 Lower Long St', city: 'Cape Town', province: 'Western Cape' },
    ticketCapacity: 1500,
    ticketPrice: 250,
    status: 'upcoming',
    featured: true,
    tags: ['food', 'wine', 'cape town', 'culinary'],
  },
  {
    title: 'Soweto Arts & Culture Festival',
    slug: 'soweto-arts-culture-festival',
    description: 'A vibrant celebration of Sowetan art, heritage, music, and dance. Free community event featuring local artists, craftspeople, and performers.',
    category: 'Arts',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    venue: { name: 'Soweto Theatre', address: 'Jabulani Amphitheatre', city: 'Soweto', province: 'Gauteng' },
    ticketCapacity: 5000,
    ticketPrice: 0,
    status: 'upcoming',
    tags: ['art', 'culture', 'soweto', 'heritage', 'free'],
  },
  {
    title: 'Durban Business Leadership Summit',
    slug: 'durban-business-leadership-summit',
    description: 'Bring together C-suite executives, entrepreneurs, and thought leaders to discuss the future of African business, investment trends, and economic development.',
    category: 'Business',
    date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    venue: { name: 'Durban ICC', address: '45 Bram Fischer Road', city: 'Durban', province: 'KwaZulu-Natal' },
    ticketCapacity: 800,
    ticketPrice: 2500,
    status: 'upcoming',
    tags: ['business', 'leadership', 'investment', 'durban'],
  },
  {
    title: 'Ultra South Africa 2025',
    slug: 'ultra-south-africa-2025',
    description: 'The world-famous Ultra Music Festival returns to South Africa. Experience 3 days of EDM, house, techno, and electronic music from top DJs across multiple stages.',
    category: 'Music',
    date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    venue: { name: 'Expo Centre', address: 'Nasrec, Soweto Road', city: 'Johannesburg', province: 'Gauteng' },
    ticketCapacity: 15000,
    ticketPrice: 1800,
    status: 'upcoming',
    tags: ['edm', 'electronic', 'festival', 'ultra'],
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ── Create Admin ──────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@advancedevents.co.za';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        phone: '+27110000000',
      });
      console.log(`✅ Admin created: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Admin already exists: ${adminEmail}`);
    }

    // ── Create Test User ──────────────────────────────────────
    const userEmail = 'user@test.com';
    let testUser = await User.findOne({ email: userEmail });
    if (!testUser) {
      testUser = await User.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: userEmail,
        password: 'User@1234',
        role: 'user',
        phone: '+27820000000',
      });
      console.log(`✅ Test user created: ${userEmail}`);
    }

    // ── Create Events ──────────────────────────────────────────
    const existingEvents = await Event.countDocuments();
    if (existingEvents === 0) {
      const eventsWithCreator = sampleEvents.map(e => ({ ...e, createdBy: admin._id }));
      await Event.insertMany(eventsWithCreator);
      console.log(`✅ ${sampleEvents.length} sample events created`);
    } else {
      console.log(`ℹ️  Events already exist (${existingEvents}), skipping`);
    }

    // ── Create Sample Enquiry ──────────────────────────────────
    const existingEnquiries = await Enquiry.countDocuments();
    if (existingEnquiries === 0) {
      await Enquiry.create({
        name: 'Thabo Nkosi',
        email: 'thabo@example.co.za',
        phone: '+27829876543',
        subject: 'Group Ticket Discount for Tech Summit',
        message: 'Hi, we have a team of 15 people wanting to attend the Tech Summit. Do you offer group discounts? We would like to book all tickets together.',
        category: 'Booking',
        status: 'new',
        priority: 'medium',
      });
      console.log('✅ Sample enquiry created');
    }

    console.log('\n🎉 Seed complete!');
    console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`   User:  ${userEmail} / User@1234`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
