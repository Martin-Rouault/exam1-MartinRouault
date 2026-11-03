// microservices/notifications/index.js
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '20kb' }));

// Configuration de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Adresse Gmail
    pass: process.env.EMAIL_APPLICATION_PASSWORD, // Mot de passe spécifique à l'application
  },
});

/**
 * N'autorise que les appels internes portant la clé partagée INTERNAL_API_KEY
 * (en-tête `x-internal-token`). Sans clé configurée, toutes les requêtes sont refusées.
 *
 * @type {import('express').RequestHandler}
 */
const requireInternalToken = (req, res, next) => {
  const expected = process.env.INTERNAL_API_KEY || '';
  const received = req.get('x-internal-token') || '';
  const valid =
    expected.length > 0 &&
    received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) return res.status(401).json({ message: 'Accès non autorisé.' });
  next();
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Route pour envoyer un email
app.post('/notify', requireInternalToken, async (req, res) => {
  const { to, subject, text } = req.body || {};

  if (
    typeof to !== 'string' || !EMAIL_REGEX.test(to) ||
    typeof subject !== 'string' || subject.length === 0 || subject.length > 200 ||
    typeof text !== 'string' || text.length === 0 || text.length > 10000
  ) {
    return res.status(400).json({ message: 'Paramètres de notification invalides.' });
  }

  try {
    // Envoi en texte brut : aucun contenu HTML interprété
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
    console.log(`Email "${subject}" envoyé`);
    return res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    // Le détail de l'erreur reste dans les logs du service, jamais dans la réponse
    console.error('Erreur lors de l\'envoi de l\'email :', error.message);
    return res.status(502).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
  }
});

// Sonde de santé (supervision, healthcheck Docker / Render)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notifications' }));

if (!process.env.INTERNAL_API_KEY) {
  console.warn('INTERNAL_API_KEY non définie : toutes les demandes de notification seront refusées.');
}

// Lancer le service Notification (PORT est injecté par l'hébergeur)
const PORT = process.env.PORT || process.env.NOTIFI_PORT || 4002;
app.listen(PORT, () => {
  console.log(`Service de notification en écoute sur le port ${PORT}`);
});
