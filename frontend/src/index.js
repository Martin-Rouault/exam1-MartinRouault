import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Configuration de la session (cookie HttpOnly, axios withCredentials) avant tout appel à l'API
import './services/auth';
import { CartProvider } from './context/CartContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <CartProvider>
    <App />
  </CartProvider>
);
