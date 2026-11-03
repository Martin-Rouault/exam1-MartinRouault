const mongoose = require('mongoose');

/**
 * Ligne de commande.
 *
 * @typedef {Object} OrderItem
 * @property {string} productId - Référence au produit.
 * @property {number} quantity - Quantité (≥ 1).
 * @property {number} price - Prix unitaire lu en base au moment de la commande.
 */
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the product in your database
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Au moins 1 produit est requis'],
  },
  price: {
    type: Number,
    required: true,
  },
});

/**
 * Commande d'un utilisateur.
 *
 * @typedef {Object} Order
 * @property {string} userId - Auteur de la commande.
 * @property {OrderItem[]} items - Articles commandés.
 * @property {number} total - Total calculé côté serveur.
 * @property {('En attente'|'En cours de traitement'|'Expédiée'|'Délivrée'|'Annulée')} status - Statut.
 * @property {{street: string, city: string, postalCode: string, country: string}} shippingAddress - Adresse de livraison.
 * @property {('Carte bancaire'|'PayPal'|'Virement')} paymentMethod - Mode de paiement.
 * @property {('colissimo'|'chronopost')} shippingMethod - Transporteur.
 */
const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the user in your database
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema], // Array of order items
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['En attente', 'En cours de traitement', 'Expédiée', 'Délivrée', 'Annulée'],
      default: 'En attente',
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['Carte bancaire', 'PayPal', 'Virement'],
      required: true,
    },
    shippingMethod: {
      type: String,
      enum: ['colissimo', 'chronopost'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create the model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
