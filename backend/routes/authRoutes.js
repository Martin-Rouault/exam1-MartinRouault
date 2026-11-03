// backend/routes/authRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, register, logout } = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { loginSchema, registerSchema } = require('../validators/schemas');

const router = express.Router();

// Limite les tentatives de connexion / inscription (protection contre la force brute)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 requêtes par IP et par fenêtre
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes.' },
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/logout', logout);

module.exports = router;
