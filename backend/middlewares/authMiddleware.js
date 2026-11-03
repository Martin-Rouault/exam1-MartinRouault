// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

/**
 * Vérifie le JWT transmis dans l'en-tête `Authorization: Bearer <token>`.
 * En cas de succès, le contenu du token ({ userId, role }) est placé dans `req.user`.
 *
 * @type {import('express').RequestHandler}
 */
exports.authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentification requise.' });

  // Algorithme imposé : refuse les tokens signés autrement (ex. "alg": "none")
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide ou expiré.' });
    }
    req.user = user;
    next();
  });
};

/**
 * Autorise uniquement les utilisateurs ayant le rôle `admin`.
 * Doit être placé après `authenticateToken`.
 *
 * @type {import('express').RequestHandler}
 */
exports.isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Accès interdit' });
  next();
};
