// src/services/auth.js
// Gestion de la session côté front.
//
// Le JWT est déposé par l'API dans un cookie HttpOnly : il n'est plus jamais stocké dans le localStorage
// (inaccessible à un script injecté). Toutes les requêtes axios envoient ce cookie (withCredentials).
// Repli : si le navigateur bloque le cookie (front et API sur deux sites différents), le token renvoyé
// à la connexion est gardé en mémoire uniquement (perdu au rechargement de la page) et envoyé en en-tête.
// Le localStorage ne contient que des informations d'affichage : nom d'utilisateur et rôle.
import axios from 'axios';
import { API_BASE_URL } from '../config';

let memoryToken = null;

axios.defaults.withCredentials = true;
axios.interceptors.request.use((config) => {
  if (memoryToken) {
    config.headers.Authorization = `Bearer ${memoryToken}`;
  }
  return config;
});

// Nettoyage des anciennes sessions qui stockaient le JWT dans le localStorage
localStorage.removeItem('token');

/**
 * Enregistre la session après une connexion réussie.
 *
 * @param {{token: string, username: string, role: string}} session - Réponse de POST /api/auth/login.
 */
export const startSession = ({ token, username, role }) => {
  memoryToken = token;
  localStorage.setItem('username', username);
  localStorage.setItem('role', role);
};

/** Indique si un utilisateur est connecté (affichage uniquement : l'API vérifie le token à chaque requête). */
export const isLoggedIn = () => !!localStorage.getItem('username');

/** Rôle de l'utilisateur connecté (affichage uniquement). */
export const getRole = () => localStorage.getItem('role');

/** Nom de l'utilisateur connecté. */
export const getUsername = () => localStorage.getItem('username');

/**
 * Déconnecte l'utilisateur : suppression du cookie côté API, puis des informations locales.
 *
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await axios.post(`${API_BASE_URL}/auth/logout`);
  } catch (error) {
    console.error('Erreur lors de la déconnexion', error);
  }
  memoryToken = null;
  localStorage.removeItem('username');
  localStorage.removeItem('role');
};
