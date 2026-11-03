// microservices/stock-management/logger.js
const { createLogger, format, transports } = require('winston');

/**
 * Logger applicatif (Winston) du service « stock-management ».
 *
 * - Sortie console au format JSON horodaté : collectée par Docker et par Render (onglet Logs).
 * - `LOG_TO_FILE=true` : écrit aussi `logs/error.log` (erreurs) et `logs/combined.log` (tout), en local.
 * - `LOG_LEVEL` : niveau minimal (`error`, `warn`, `info`, `http`, `debug`), `http` par défaut (inclut les requêtes).
 *
 * Ne jamais journaliser de secret (mot de passe, token, URI de base de données, clé API).
 */
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'http',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'stock-management', env: process.env.NODE_ENV || 'development' },
  transports: [new transports.Console()],
});

if (process.env.LOG_TO_FILE === 'true') {
  logger.add(new transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new transports.File({ filename: 'logs/combined.log' }));
}

/**
 * Middleware Express journalisant chaque requête HTTP (méthode, URL, statut, durée, IP).
 * Les en-têtes et le corps ne sont pas journalisés (ils peuvent contenir des secrets).
 *
 * @type {express.RequestHandler}
 */
logger.httpLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, 'requête HTTP', {
      method: req.method,
      url: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      ip: req.ip,
    });
  });
  next();
};

module.exports = logger;
