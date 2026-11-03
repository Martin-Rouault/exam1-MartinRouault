// gateway/routes/notifi.js
const express = require('express');
const proxy = require('express-http-proxy');
require('dotenv').config();
const logger = require('../logger');

const router = express.Router();

const NOTIFI_SERVICE_URL = process.env.NOTIFI_SERVICE_URL;

if (NOTIFI_SERVICE_URL) {
  // Relaie la requête telle quelle (chemin et en-têtes, dont x-internal-token) vers le microservice
  router.use(
    '/',
    proxy(NOTIFI_SERVICE_URL, {
      proxyReqPathResolver: (req) => req.originalUrl,
      proxyErrorHandler: (err, res) => {
        logger.error('microservice de notification injoignable', { error: err.message });
        res.status(502).json({ message: 'Service de notification indisponible.' });
      },
    })
  );
} else {
  // Variable absente : le gateway démarre quand même, seule cette route répond 503
  logger.warn('NOTIFI_SERVICE_URL non défini : route désactivée');
  router.use('/', (req, res) =>
    res.status(503).json({ message: 'Service de notification non configuré.' })
  );
}

module.exports = router;
