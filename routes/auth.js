// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { registerRules, loginRules, handleValidation } = require('../middleware/validate');

router.get('/register', redirectIfAuthenticated, authController.getRegister);
router.post('/register', redirectIfAuthenticated, registerRules, handleValidation, authController.postRegister);

router.get('/login', redirectIfAuthenticated, authController.getLogin);
router.post('/login', redirectIfAuthenticated, loginRules, handleValidation, authController.postLogin);

router.post('/logout', authController.logout);

module.exports = router;
