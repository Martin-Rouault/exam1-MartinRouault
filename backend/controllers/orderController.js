// backend/controllers/orderController.js
const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../config/logger');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';
// Clé partagée exigée par les microservices (appels internes uniquement)
const internalHeaders = { 'x-internal-token': process.env.INTERNAL_API_KEY || '' };

/**
 * Remet en stock les quantités déjà décrémentées quand une commande échoue en cours de création.
 *
 * @param {Array<{productId: string, quantity: number}>} decremented - Articles déjà réservés.
 * @returns {Promise<void>}
 */
const rollbackStock = async (decremented) => {
  for (const { productId, quantity } of decremented) {
    try {
      await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
    } catch (error) {
      logger.error('échec de la remise en stock', { productId, quantity, error: error.message });
    }
  }
};

/**
 * Crée une commande pour l'utilisateur connecté.
 *
 * Étapes : réservation atomique du stock de chaque article (`stock >= quantité`), lecture du prix
 * en base (le prix envoyé par le client est ignoré), enregistrement de la commande, puis
 * notification email non bloquante via le gateway. En cas d'échec, le stock est restauré.
 *
 * @route POST /api/orders
 * @param {express.Request} req - `req.user.userId` (JWT) ; `req.body` validé par `createOrderSchema`.
 * @param {express.Response} res - 201 `{ message, order }` ; 400 données invalides ; 404 produit introuvable ; 409 stock insuffisant.
 * @returns {Promise<void>}
 */
exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, shippingMethod } = req.body;
  const { userId } = req.user;

  // Vérification du format des données
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Le corps de la requête doit contenir un tableau d'objets { productId, quantity }.",
    });
  }
  const invalidItem = items.find(
    ({ productId, quantity }) =>
      !mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1
  );
  if (invalidItem) {
    return res.status(400).json({ message: 'Produit ou quantité invalide dans la commande.' });
  }

  const decremented = [];
  const orderDetails = [];
  let savedOrder;

  try {
    // Réservation du stock : décrément atomique, uniquement si le stock est suffisant
    for (const { productId, quantity } of items) {
      const updated = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updated) {
        await rollbackStock(decremented);
        logger.warn('commande refusée : stock insuffisant ou produit introuvable', {
          productId,
          quantity,
          userId,
        });
        const product = await Product.findById(productId).select('name');
        return product
          ? res.status(409).json({ message: `Stock insuffisant pour « ${product.name} ».` })
          : res.status(404).json({ message: `Produit ${productId} introuvable.` });
      }
      decremented.push({ productId, quantity });
      // Prix lu en base : le prix envoyé par le client n'est jamais utilisé
      orderDetails.push({ productId, quantity, price: updated.price });
    }

    const total = orderDetails.reduce((acc, { price, quantity }) => acc + price * quantity, 0);

    savedOrder = await new Order({
      userId,
      items: orderDetails,
      total,
      shippingAddress,
      paymentMethod,
      shippingMethod,
    }).save();

    logger.info('audit: commande créée', {
      audit: true,
      orderId: savedOrder._id.toString(),
      userId,
      total,
    });
  } catch (error) {
    await rollbackStock(decremented);
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ message: "Commande invalide : vérifiez l'adresse, la livraison et le paiement." });
    }
    logger.error('Erreur lors de la création de la commande', {
      error: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ message: 'Une erreur est survenue lors de la création de la commande.' });
  }

  // Notification du client (non bloquante : la commande est déjà enregistrée)
  try {
    const user = await User.findById(userId).select('email');
    if (user?.email) {
      await axios.post(
        `${GATEWAY_URL}/notify`,
        {
          to: user.email,
          subject: 'Nouvelle Commande Créée',
          text: `Une commande a été créée avec succès pour les produits suivants : \n${savedOrder.items
            .map((item) => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
            .join('\n')}`,
        },
        { headers: internalHeaders, timeout: 10000 }
      );
    }
  } catch (error) {
    logger.error("échec de l'envoi de la notification", {
      orderId: savedOrder._id.toString(),
      error: error.message,
    });
  }

  res.status(201).json({ message: 'Commande créée avec succès', order: savedOrder });
};

/**
 * Supprime une commande (administrateurs uniquement).
 *
 * @route DELETE /api/orders/:id
 * @param {express.Request} req - `req.params.id` : identifiant de la commande.
 * @param {express.Response} res - 200 supprimée ; 400 identifiant invalide ; 404 introuvable.
 * @returns {Promise<void>}
 */
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }
    logger.info('audit: commande supprimée', {
      audit: true,
      orderId: order._id.toString(),
      by: req.user?.userId,
    });
    res.status(200).json({ message: `Commande ${order._id} supprimée.` });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Identifiant de commande invalide.' });
    }
    logger.error('Erreur lors de la suppression de la commande :', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * Liste toutes les commandes (administrateurs uniquement).
 *
 * @route GET /api/orders
 * @param {express.Request} req
 * @param {express.Response} res - 200 tableau de commandes ; 500 erreur base de données.
 * @returns {Promise<void>}
 */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    logger.error('Erreur lors de la récupération des commandes :', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes.' });
  }
};

/**
 * Valide une commande : passage au statut « En cours de traitement » (administrateurs uniquement).
 *
 * @route PUT /api/orders/:id/validate
 * @param {express.Request} req - `req.params.id` : identifiant de la commande.
 * @param {express.Response} res - 200 `{ message, order }` ; 400 identifiant invalide ; 404 introuvable.
 * @returns {Promise<void>}
 */
exports.validateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'En cours de traitement' },
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }
    logger.info('audit: commande validée', {
      audit: true,
      orderId: order._id.toString(),
      by: req.user?.userId,
    });
    res.status(200).json({ message: `Commande ${order._id} validée avec succès.`, order });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Identifiant de commande invalide.' });
    }
    logger.error('Erreur lors de la validation de la commande :', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * Change le statut d'une commande (administrateurs uniquement). Le statut doit appartenir à l'enum du modèle `Order`.
 *
 * @route PUT /api/orders/:orderId/status
 * @param {express.Request} req - `req.params.orderId` ; `req.body.status`.
 * @param {express.Response} res - 200 `{ message, order }` ; 400 statut ou identifiant invalide ; 404 introuvable.
 * @returns {Promise<void>}
 */
exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Le statut est requis.' });
  }

  try {
    // runValidators : sans lui, Mongoose n'applique pas l'enum du modèle sur un update
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    logger.info('audit: statut de commande modifié', {
      audit: true,
      orderId,
      status,
      by: req.user?.userId,
    });
    res.status(200).json({ message: 'Statut mis à jour avec succès', order });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const allowed = Order.schema.path('status').enumValues.join(', ');
      return res.status(400).json({ message: `Statut invalide. Valeurs autorisées : ${allowed}.` });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Identifiant de commande invalide.' });
    }
    logger.error('Erreur lors de la mise à jour de la commande :', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
