// src/config.js
// URL de l'API backend, injectée au build (variable REACT_APP_API_URL).
// Create React App remplace process.env.REACT_APP_* au moment du build :
// changer d'environnement (local, préprod, prod) impose donc de reconstruire le front.
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";
