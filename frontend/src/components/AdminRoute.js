// src/components/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Garde de route administrateur : redirige vers l'accueil si l'utilisateur n'est pas connecté
 * ou n'a pas le rôle « admin ». Protection d'interface uniquement : le contrôle réel est fait
 * par l'API (middlewares authenticateToken + isAdmin).
 */
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
