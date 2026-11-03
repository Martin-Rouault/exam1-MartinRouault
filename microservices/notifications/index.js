// microservices/notifications/index.js
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();
const logger = require('./logger');

const app = express();
app.use(express.json({ limit: '20kb' }));
app.use(logger.httpLogger);

/**
 * Crée le transport SMTP de Nodemailer.
 *
 * - Si `SMTP_HOST` est défini (production) : serveur SMTP générique, ex. Brevo
 *   `smtp-relay.brevo.com` sur le port 2525. Render bloque les ports 25, 465 et 587
 *   en offre gratuite ; 2525 reste autorisé.
 * - Sinon (local, Docker) : Gmail avec un mot de passe d'application, comme à l'origine.
 *
 * @returns {nodemailer.Transporter} Transport prêt à l'emploi.
 */
const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // TLS implicite sur 465, STARTTLS sur les autres ports
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Adresse Gmail
      pass: process.env.EMAIL_APPLICATION_PASSWORD, // Mot de passe spécifique à l'application
    },
  });
};

const transporter = createTransporter();
// Adresse d'expédition : doit être un expéditeur validé chez le fournisseur SMTP
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;

/**
 * N'autorise que les appels internes portant la clé partagée INTERNAL_API_KEY
 * (en-tête `x-internal-token`). Sans clé configurée, toutes les requêtes sont refusées.
 *
 * @type {express.RequestHandler}
 */
const requireInternalToken = (req, res, next) => {
  const expected = process.env.INTERNAL_API_KEY || '';
  const received = req.get('x-internal-token') || '';
  const valid =
    expected.length > 0 &&
    received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) {
    logger.warn('appel /notify refusé : clé interne absente ou invalide', { ip: req.ip });
    return res.status(401).json({ message: 'Accès non autorisé.' });
  }
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
    await transporter.sendMail({ from: EMAIL_FROM, to, subject, text });
    logger.info('email envoyé', { subject });
    return res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    // Le détail de l'erreur reste dans les logs du service, jamais dans la réponse
    logger.error('échec de l\'envoi de l\'email', { subject, error: error.message });
    return res.status(502).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
  }
});

// Sonde de santé (supervision, healthcheck Docker / Render)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notifications' }));

if (!process.env.INTERNAL_API_KEY) {
  logger.warn('INTERNAL_API_KEY non définie : toutes les demandes de notification seront refusées.');
}

// Lancer le service Notification (PORT est injecté par l'hébergeur)
const PORT = process.env.PORT || process.env.NOTIFI_PORT || 4002;
app.listen(PORT, () => {
  logger.info('service de notification démarré', { port: Number(PORT), smtp: process.env.SMTP_HOST ? 'smtp' : 'gmail' });
});
