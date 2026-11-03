// src/components/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { isLoggedIn, getRole } from '../services/auth';

/**
 * Garde de route administrateur : redirige vers l'accueil si l'utilisateur n'est pas connecté
 * ou n'a pas le rôle « admin ». Protection d'interface uniquement : le contrôle réel est fait
 * par l'API (middlewares authenticateToken + isAdmin).
 */
const AdminRoute = ({ children }) => {
  if (!isLoggedIn() || getRole() !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
