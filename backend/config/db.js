// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Ouvre la connexion MongoDB à partir de MONGO_URI. Arrête le processus en cas d'échec.
 * L'URI n'est jamais écrite dans les logs : elle contient l'identifiant et le mot de passe de la base.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connecté');
    } catch (err) {
        console.error('Connexion MongoDB impossible :', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
