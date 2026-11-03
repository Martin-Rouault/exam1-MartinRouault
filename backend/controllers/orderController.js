// backend/controllers/orderController.js
const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';
// Clé partagée exigée par les microservices (appels internes uniquement)
const internalHeaders = { 'x-internal-token': process.env.INTERNAL_API_KEY || '' };

// Remet en stock les quantités déjà décrémentées (annulation d'une commande ratée)
const rollbackStock = async (decremented) => {
  for (const { productId, quantity } of decremented) {
    try {
      await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
    } catch (error) {
      console.error(`Échec de la remise en stock du produit ${productId}`, error);
    }
  }
};

exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, shippingMethod } = req.body;
  const { userId } = req.user;

  // Vérification du format des données
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'Le corps de la requête doit contenir un tableau d\'objets { productId, quantity }.',
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

    console.log('Commande sauvegardée :', savedOrder._id.toString());
  } catch (error) {
    await rollbackStock(decremented);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Commande invalide : vérifiez l\'adresse, la livraison et le paiement.' });
    }
    console.error('Erreur lors de la création de la commande', error);
    return res.status(500).json({ message: 'Une erreur est survenue lors de la création de la commande.' });
  }

  // Notification du client (non bloquante : la commande est déjà enregistrée)
  try {
    const user = await User.findById(userId).select('email');
    if (user?.email) {
      await axios.post(`${GATEWAY_URL}/notify`, {
        to: user.email,
        subject: 'Nouvelle Commande Créée',
        text: `Une commande a été créée avec succès pour les produits suivants : \n${savedOrder.items
          .map((item) => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
          .join('\n')}`,
      }, { headers: internalHeaders, timeout: 10000 });
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification', error.message);
  }

  res.status(201).json({ message: 'Commande créée avec succès', order: savedOrder });
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }
    res.status(200).json({ message: `Commande ${order._id} supprimée.` });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Identifiant de commande invalide.' });
    }
    console.error('Erreur lors de la suppression de la commande :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes :', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes.' });
  }
};

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
    res.status(200).json({ message: `Commande ${order._id} validée avec succès.`, order });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Identifiant de commande invalide.' });
    }
    console.error('Erreur lors de la validation de la commande :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

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

    res.status(200).json({ message: 'Statut mis à jour avec succès', order });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const allowed = Order.schema.path('status').enumValues.join(', ');
      return res.status(400).json({ message: `Statut invalide. Valeurs autorisées : ${allowed}.` });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Identifiant de commande invalide.' });
    }
    console.error('Erreur lors de la mise à jour de la commande :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
