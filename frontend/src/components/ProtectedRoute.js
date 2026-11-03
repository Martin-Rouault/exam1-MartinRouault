// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../services/auth';

/**
 * Garde de route : redirige vers /login si aucun utilisateur n'est connecté.
 * L'API vérifie de son côté la validité du token à chaque requête.
 */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = isLoggedIn();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
