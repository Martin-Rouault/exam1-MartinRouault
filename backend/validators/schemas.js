// backend/validators/schemas.js
// Schémas de validation des entrées utilisateur (Joi).
// Imposer des chaînes de caractères bloque aussi les injections NoSQL
// du type { "username": { "$ne": null } }.
const Joi = require('joi');
const Order = require('../models/Order');

const objectId = Joi.string().hex().length(24);

const messages = {
  'string.empty': '{#label} est obligatoire.',
  'any.required': '{#label} est obligatoire.',
  'string.base': '{#label} doit être une chaîne de caractères.',
};

exports.registerSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30).required().label("Le nom d'utilisateur"),
  email: Joi.string().trim().lowercase().email().max(254).required().label("L'email"),
  password: Joi.string().min(8).max(128).required().label('Le mot de passe'),
}).messages(messages);

exports.loginSchema = Joi.object({
  username: Joi.string().trim().max(30).required().label("Le nom d'utilisateur"),
  password: Joi.string().max(128).required().label('Le mot de passe'),
}).messages(messages);

exports.createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: objectId.required(),
        quantity: Joi.number().integer().min(1).max(100).required(),
      })
    )
    .min(1)
    .max(50)
    .required()
    .label('Le panier'),
  shippingAddress: Joi.object({
    street: Joi.string().trim().max(200).required().label('La rue'),
    city: Joi.string().trim().max(100).required().label('La ville'),
    postalCode: Joi.string()
      .trim()
      .pattern(/^[0-9A-Za-z -]{3,10}$/)
      .required()
      .label('Le code postal'),
    country: Joi.string().trim().max(100).required().label('Le pays'),
  }).required(),
  paymentMethod: Joi.string()
    .valid(...Order.schema.path('paymentMethod').enumValues)
    .required(),
  shippingMethod: Joi.string()
    .valid(...Order.schema.path('shippingMethod').enumValues)
    .required(),
}).messages(messages);

exports.orderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Order.schema.path('status').enumValues)
    .required()
    .label('Le statut'),
}).messages(messages);

exports.stockSchema = Joi.object({
  stock: Joi.number().integer().min(0).max(1000000).required().label('Le stock'),
}).messages(messages);

exports.idParamSchema = Joi.object({ id: objectId.required() });
exports.orderIdParamSchema = Joi.object({ orderId: objectId.required() });
exports.productIdParamSchema = Joi.object({ productId: objectId.required() });
