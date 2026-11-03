// backend/middlewares/validate.js

/**
 * Crée un middleware Express qui valide une partie de la requête avec un schéma Joi.
 * Les champs inconnus sont supprimés et les valeurs sont converties au type attendu.
 *
 * @param {Joi.ObjectSchema} schema - Schéma Joi à appliquer.
 * @param {'body'|'params'} [property='body'] - Partie de la requête à valider.
 * @returns {express.RequestHandler} Middleware renvoyant 400 si les données sont invalides.
 */
const validate =
  (schema, property = 'body') =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[property] ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => detail.message.replace(/"/g, ''));
      return res.status(400).json({ message: details.join(' '), details });
    }

    req[property] = value;
    next();
  };

module.exports = validate;
