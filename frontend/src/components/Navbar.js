// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { isLoggedIn, getUsername, logout } from '../services/auth';

/**
 * Barre de navigation.
 * Affiche le nombre d'articles du panier, le nom de l'utilisateur connecté et les liens
 * connexion / inscription ou le bouton de déconnexion (qui supprime le cookie de session côté API et le nom / rôle stockés localement).
 */
const Navbar = () => {
  const navigate = useNavigate();
  const { cart } = useCart();

  const isAuthenticated = isLoggedIn();
  const username = getUsername();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-500 text-white p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-xl font-bold">
          Mon Application
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Afficher le nom de l'utilisateur s'il est connecté */}
        {isAuthenticated && <span className="font-semibold">Bonjour, {username}</span>}

        {/* Lien vers le Panier avec le nombre d'articles */}
        <Link to="/cart" className="relative">
          <span>Panier</span>
          {cart.length > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs px-2">
              {cart.length}
            </span>
          )}
        </Link>

        {/* Lien Connexion / Déconnexion */}
        {!isAuthenticated ? (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        ) : (
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">
            Déconnexion
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
