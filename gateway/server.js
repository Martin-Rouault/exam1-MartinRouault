// gateway/server.js
const express = require('express');
const dotenv = require('dotenv');
const logger = require('./logger');
//const authProxy = require('./routes/auth');
const notifiProxy = require('./routes/notifi');
const stockProxy = require('./routes/stock');

dotenv.config();

const app = express();
app.disable('x-powered-by');

// Journalisation de chaque requête relayée
app.use(logger.httpLogger);

// Middleware pour analyser les requêtes JSON
app.use(express.json({ limit: '20kb' }));

// Routes principales pour chaque microservice
//app.use('/auth', authProxy);
app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);

// Sonde de santé (supervision, healthcheck Docker / Render)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway' }));

// Lancer le Gateway (PORT est injecté par l'hébergeur)
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8000;
app.listen(PORT, () => {
  logger.info('gateway démarré', {
    port: Number(PORT),
    notifications: process.env.NOTIFI_SERVICE_URL,
    stock: process.env.STOCK_SERVICE_URL,
  });
});