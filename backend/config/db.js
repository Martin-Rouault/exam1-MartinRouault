// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('./logger');

/**
 * Ouvre la connexion MongoDB à partir de MONGO_URI. Arrête le processus en cas d'échec.
 * L'URI n'est jamais écrite dans les logs : elle contient l'identifiant et le mot de passe de la base.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connecté', { database: mongoose.connection.name });
  } catch (err) {
    logger.error('connexion MongoDB impossible', { error: err.message });
    process.exit(1);
  }
};

module.exports = connectDB;
