// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Utilisateur de l'application.
 *
 * @typedef {Object} User
 * @property {string} username - Identifiant de connexion, unique.
 * @property {string} email - Adresse email, unique.
 * @property {string} password - Hash bcrypt du mot de passe (jamais stocké en clair).
 * @property {('user'|'admin')} role - Rôle, `user` par défaut.
 */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }, // Peut être 'user' ou 'admin'
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
