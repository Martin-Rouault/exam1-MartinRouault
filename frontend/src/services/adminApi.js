// src/services/adminApi.js
// Appels API réservés aux administrateurs. L'authentification est transmise automatiquement
// (cookie HttpOnly, ou en-tête de repli ajouté par services/auth.js) ; les erreurs sont gérées par les pages.
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const getOrders = () => axios.get(`${API_BASE_URL}/orders`);

export const getProducts = () => axios.get(`${API_BASE_URL}/products`);

export const updateOrderStatus = (orderId, status) =>
  axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status });

export const validateOrder = (orderId) =>
  axios.put(`${API_BASE_URL}/orders/${orderId}/validate`, {});

export const updateProductStock = (productId, stock) =>
  axios.put(`${API_BASE_URL}/products/${productId}/stock`, { stock });
