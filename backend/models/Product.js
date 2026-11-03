// backend/models/Product.js
const mongoose = require('mongoose');

/**
 * Produit du catalogue.
 *
 * @typedef {Object} Product
 * @property {string} name - Nom affiché.
 * @property {number} price - Prix unitaire en euros (seule source de vérité pour le calcul des commandes).
 * @property {string} description - Description.
 * @property {number} stock - Quantité disponible, décrémentée à chaque commande.
 */
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  stock: { type: Number, required: true },
}, {
  timestamps: true, // Ajoute createdAt et updatedAt
});

module.exports = mongoose.model('Product', productSchema);