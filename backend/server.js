// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const connectDB = require('./config/db');
const logger = require('./config/logger');

// Refuse de démarrer sans secret JWT robuste (≥ 32 caractères)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET absent ou trop court (32 caractères minimum). Arrêt du serveur.');
  process.exit(1);
}

const app = express();
connectDB();

// Derrière le proxy de l'hébergeur : nombre de proxys à faire confiance (IP réelle pour le rate limit)
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
}

// Journalisation de chaque requête HTTP (méthode, URL, statut, durée, IP)
app.use(logger.httpLogger);

// En-têtes HTTP de sécurité (supprime aussi X-Powered-By)
app.use(helmet());

// CORS : seules les origines du frontend sont autorisées (liste séparée par des virgules)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins }));

// Corps JSON limité à 10 ko
app.use(express.json({ limit: '10kb' }));

app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Sonde de santé (supervision, healthcheck Docker / Render)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'backend' }));

// Gestionnaire d'erreurs : réponse JSON générique, jamais de pile d'appels envoyée au client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Corps de requête JSON invalide.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Corps de requête trop volumineux.' });
  }
  logger.error('erreur non gérée', { error: err.message, stack: err.stack, url: req.originalUrl });
  res.status(500).json({ message: 'Erreur serveur.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info('serveur démarré', { port: Number(PORT) }));
