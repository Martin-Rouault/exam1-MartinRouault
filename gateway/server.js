// gateway/server.js
const express = require('express');
const dotenv = require('dotenv');
//const authProxy = require('./routes/auth');
const notifiProxy = require('./routes/notifi');
const stockProxy = require('./routes/stock');

dotenv.config();

const app = express();
app.disable('x-powered-by');

// Middleware pour analyser les requêtes JSON
app.use(express.json());

// Routes principales pour chaque microservice
//app.use('/auth', authProxy);
app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);

// Sonde de santé (supervision, healthcheck Docker / Render)
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway' }));

// Lancer le Gateway (PORT est injecté par l'hébergeur)
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8000;
app.listen(PORT, () => {
  console.log(`Gateway opérationnel sur le port ${PORT}`);
});