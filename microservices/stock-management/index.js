// microservices/stock-management/index.js
const crypto = require('crypto');
const express = require('express');
const logger = require('./logger');
const app = express();
const PORT = process.env.PORT || 4003;

app.use(express.json({ limit: '10kb' }));
app.use(logger.httpLogger);

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
    logger.warn('appel /update-stock refusé : clé interne absente ou invalide', { ip: req.ip });
    return res.status(401).json({ message: 'Accès non autorisé.' });
  }
  next();
};

app.post('/update-stock', requireInternalToken, (req, res) => {
  const { productId, quantity } = req.body || {};
  if (typeof productId !== 'string' || !Number.isInteger(quantity)) {
    return res.status(400).json({ message: 'Paramètres invalides.' });
  }
  logger.info('mise à jour du stock', { productId, quantity });
  res.json({ message: `Stock mis à jour pour le produit ${productId}` });
});

// Sonde de santé (supervision, healthcheck Docker / Render)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'stock-management' }));

app.listen(PORT, () => logger.info('service de gestion des stocks démarré', { port: Number(PORT) }));
