// backend/utils/authCookie.js
// Gestion du cookie d'authentification (JWT) : création, suppression et lecture.

/** Nom du cookie contenant le JWT. */
const COOKIE_NAME = 'token';

/** Durée de vie du cookie, alignée sur l'expiration du JWT (1 heure). */
const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Options du cookie selon l'environnement.
 *
 * - `httpOnly` : le cookie est inaccessible au JavaScript du navigateur (protection contre le vol par XSS).
 * - Production (`NODE_ENV=production`, HTTPS) : `Secure`, `SameSite=None` (le front et l'API sont sur deux
 *   sous-domaines distincts de onrender.com, donc deux « sites » différents) et `Partitioned` (CHIPS),
 *   qui permet au cookie d'être accepté par les navigateurs qui bloquent les cookies tiers non partitionnés.
 * - Local (HTTP) : `SameSite=Lax`, sans `Secure` (localhost:3000 et localhost:5000 sont le même site).
 *
 * @returns {import('express').CookieOptions} Options passées à `res.cookie` / `res.clearCookie`.
 */
const cookieOptions = () => {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    partitioned: production,
    path: '/',
  };
};

/**
 * Dépose le JWT dans un cookie HttpOnly.
 *
 * @param {express.Response} res - Réponse Express.
 * @param {string} token - JWT signé.
 * @returns {void}
 */
const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
};

/**
 * Supprime le cookie d'authentification (déconnexion).
 *
 * @param {express.Response} res - Réponse Express.
 * @returns {void}
 */
const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
};

/**
 * Lit le JWT dans l'en-tête `Cookie` de la requête (sans dépendance supplémentaire).
 *
 * @param {express.Request} req - Requête Express.
 * @returns {string|undefined} Le JWT, ou `undefined` s'il est absent.
 */
const readAuthCookie = (req) => {
  const header = req.headers?.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === COOKIE_NAME) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
};

module.exports = { setAuthCookie, clearAuthCookie, readAuthCookie, COOKIE_NAME };
