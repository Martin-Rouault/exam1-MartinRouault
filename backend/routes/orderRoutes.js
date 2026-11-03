// backend/routes/orderRoutes.js
const express = require('express');
const {
  createOrder,
  deleteOrder,
  getOrders,
  validateOrder,
  updateOrderStatus,
} = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const {
  createOrderSchema,
  orderStatusSchema,
  idParamSchema,
  orderIdParamSchema,
} = require('../validators/schemas');

const router = express.Router();

router.get('/', authenticateToken, isAdmin, getOrders); // Accès pour administrateurs
router.post('/', authenticateToken, validate(createOrderSchema), createOrder); // Accès pour utilisateurs connectés
router.delete('/:id', authenticateToken, isAdmin, validate(idParamSchema, 'params'), deleteOrder); // Accès pour administrateurs
router.put(
  '/:id/validate',
  authenticateToken,
  isAdmin,
  validate(idParamSchema, 'params'),
  validateOrder
); // Accès pour administrateurs
router.put(
  '/:orderId/status',
  authenticateToken,
  isAdmin,
  validate(orderIdParamSchema, 'params'),
  validate(orderStatusSchema),
  updateOrderStatus
); // Accès pour administrateurs

module.exports = router;
