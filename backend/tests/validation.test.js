// Tests unitaires de la validation des entrées et des middlewares d'authentification.
// Exécution : npm test (runner natif node:test, aucune base de données nécessaire).
const { test } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'secret-de-test-suffisamment-long-pour-les-tests';

const { loginSchema, registerSchema, createOrderSchema, orderStatusSchema, stockSchema } = require('../validators/schemas');
const validate = require('../middlewares/validate');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

/** Crée un faux objet réponse Express qui mémorise le statut et le corps. */
const mockRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const validOrder = {
  items: [{ productId: '507f1f77bcf86cd799439011', quantity: 2 }],
  shippingAddress: { street: '1 rue de Paris', city: 'Paris', postalCode: '75001', country: 'France' },
  paymentMethod: 'PayPal',
  shippingMethod: 'colissimo',
};

test('login : refuse une injection NoSQL ({ $ne: null })', () => {
  const { error } = loginSchema.validate({ username: { $ne: null }, password: 'x' });
  assert.ok(error);
});

test('inscription : refuse un mot de passe de moins de 8 caractères', () => {
  const { error } = registerSchema.validate({ username: 'martin', email: 'm@x.fr', password: '123' });
  assert.ok(error);
});

test('inscription : refuse un nom contenant du HTML / JavaScript', () => {
  const { error } = registerSchema.validate({ username: "<script>alert('test')</script>", email: 'm@x.fr', password: 'motdepasse' });
  assert.ok(error);
});

test('commande : le prix envoyé par le client est supprimé', () => {
  const { error, value } = createOrderSchema.validate(
    { ...validOrder, items: [{ ...validOrder.items[0], price: 0.01 }], total: 0.01 },
    { stripUnknown: true }
  );
  assert.ifError(error);
  assert.strictEqual(value.items[0].price, undefined);
  assert.strictEqual(value.total, undefined);
});

test('commande : refuse une quantité nulle ou un mode de paiement inconnu', () => {
  assert.ok(createOrderSchema.validate({ ...validOrder, items: [{ productId: '507f1f77bcf86cd799439011', quantity: 0 }] }).error);
  assert.ok(createOrderSchema.validate({ ...validOrder, paymentMethod: 'Bitcoin' }).error);
});

test('statut : seules les valeurs de l\'enum sont acceptées', () => {
  assert.ifError(orderStatusSchema.validate({ status: 'Expédiée' }).error);
  assert.ok(orderStatusSchema.validate({ status: 'Hacked' }).error);
});

test('stock : 0 est accepté, une valeur négative est refusée', () => {
  assert.ifError(stockSchema.validate({ stock: 0 }).error);
  assert.ok(stockSchema.validate({ stock: -1 }).error);
});

test('middleware validate : renvoie 400 sans appeler next() si les données sont invalides', () => {
  const res = mockRes();
  let called = false;
  validate(loginSchema)({ body: {} }, res, () => { called = true; });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(called, false);
});

test('authenticateToken : 401 sans token, 403 avec un token "alg: none"', () => {
  const res1 = mockRes();
  authenticateToken({ headers: {} }, res1, () => assert.fail('next() ne doit pas être appelé'));
  assert.strictEqual(res1.statusCode, 401);

  const unsigned = jwt.sign({ userId: 'x', role: 'admin' }, null, { algorithm: 'none' });
  const res2 = mockRes();
  authenticateToken({ headers: { authorization: `Bearer ${unsigned}` }, originalUrl: '/', ip: '::1' }, res2, () => assert.fail('next() ne doit pas être appelé'));
  assert.strictEqual(res2.statusCode, 403);
});

test('authenticateToken + isAdmin : un utilisateur "user" est refusé, un "admin" passe', () => {
  for (const [role, expectedNext] of [['user', false], ['admin', true]]) {
    const token = jwt.sign({ userId: 'u1', role }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const req = { headers: { authorization: `Bearer ${token}` }, originalUrl: '/api/orders', method: 'DELETE' };
    const res = mockRes();
    let nextCalled = false;
    authenticateToken(req, res, () => isAdmin(req, res, () => { nextCalled = true; }));
    assert.strictEqual(nextCalled, expectedNext, `rôle ${role}`);
  }
});
