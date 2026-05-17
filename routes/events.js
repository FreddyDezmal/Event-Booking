// routes/events.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.get('/', eventController.getEvents);
router.get('/:slug', eventController.getEventDetail);

module.exports = router;
