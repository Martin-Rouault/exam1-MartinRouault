// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Garde de route : redirige vers /login si aucun token n'est présent.
 * L'API vérifie de son côté la validité du token à chaque requête.
 */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token'); // Vérifiez le token de connexion
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
