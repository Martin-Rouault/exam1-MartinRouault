// controllers/productController.js
const Product = require('../models/Product');
const logger = require('../config/logger');

/**
 * Liste tous les produits du catalogue (route publique).
 *
 * @route GET /api/products
 * @param {express.Request} req
 * @param {express.Response} res - 200 tableau de produits ; 500 erreur base de données.
 * @returns {Promise<void>}
 */
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    logger.error('Erreur lors de la récupération des produits :', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Erreur lors de la récupération des produits.' });
  }
};

/**
 * Remplace le stock d'un produit (administrateurs uniquement).
 *
 * @route PUT /api/products/:productId/stock
 * @param {express.Request} req - `req.params.productId` (ObjectId) ; `req.body.stock` (entier ≥ 0).
 * @param {express.Response} res - 200 produit mis à jour ; 400 donnée invalide ; 404 produit introuvable.
 * @returns {Promise<void>}
 */
exports.updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const stock = Number(req.body.stock);

    if (
      req.body.stock === undefined ||
      req.body.stock === '' ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return res
        .status(400)
        .json({ message: 'Le stock doit être un nombre entier positif ou nul.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé.' });
    }

    product.stock = stock;
    await product.save();

    logger.info('audit: stock modifié', { audit: true, productId, stock, by: req.user?.userId });
    res.json({ message: 'Stock mis à jour avec succès.', product });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Identifiant de produit invalide.' });
    }
    logger.error('Erreur lors de la mise à jour du stock :', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
