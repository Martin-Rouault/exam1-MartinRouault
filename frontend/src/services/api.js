// src/services/api.js
// Appels API publics et utilisateur. L'authentification est transmise automatiquement
// (cookie HttpOnly, ou en-tête de repli ajouté par services/auth.js).
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const fetchProducts = () => axios.get(`${API_BASE_URL}/products`);

export const createOrder = (orderData) => axios.post(`${API_BASE_URL}/orders`, orderData);
