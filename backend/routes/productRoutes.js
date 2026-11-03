// routes/productRoutes.js
const express = require('express');
const { getProducts, updateProductStock } = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { stockSchema, productIdParamSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', getProducts);
router.put(
  '/:productId/stock',
  authenticateToken,
  isAdmin,
  validate(productIdParamSchema, 'params'),
  validate(stockSchema),
  updateProductStock
);

module.exports = router;
