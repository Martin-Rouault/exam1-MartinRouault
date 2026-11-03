// gateway/routes/stock.js
const express = require('express');
const proxy = require('express-http-proxy');
require('dotenv').config();
const logger = require('../logger');

const router = express.Router();

const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL;

if (STOCK_SERVICE_URL) {
  // Relaie la requête telle quelle (chemin et en-têtes, dont x-internal-token) vers le microservice
  router.use('/', proxy(STOCK_SERVICE_URL, {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res) => {
      logger.error('microservice de stock injoignable', { error: err.message });
      res.status(502).json({ message: 'Service de stock indisponible.' });
    },
  }));
} else {
  // Variable absente : le gateway démarre quand même, seule cette route répond 503
  logger.warn('STOCK_SERVICE_URL non défini : route désactivée');
  router.use('/', (req, res) => res.status(503).json({ message: 'Service de stock non configuré.' }));
}

module.exports = router;
