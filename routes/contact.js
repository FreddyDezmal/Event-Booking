// routes/contact.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { enquiryRules, handleValidation } = require('../middleware/validate');

router.get('/', contactController.getContact);
router.post('/', enquiryRules, handleValidation, contactController.postContact);

module.exports = router;
