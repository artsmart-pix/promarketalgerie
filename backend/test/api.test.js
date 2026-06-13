const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// ── Isolated test environment (set BEFORE requiring the app) ──
const TMP_DB = path.join('/tmp', `pm_apitest_${process.pid}.sqlite`);
process.env.SQLITE_PATH = TMP_DB;
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const { setupTestDb, ADMIN } = require('./setup-db');

let request, app, adminToken, userToken;

before(async () => {
  await setupTestDb(TMP_DB);
  app = require('../server').app;          // requires after the DB exists
  request = require('supertest');
  // Admin login
  const a = await request(app).post('/api/auth/login').send(ADMIN);
  adminToken = a.body.token;
});

after(() => fs.rmSync(TMP_DB, { force: true }));

describe('Auth', () => {
  test('register valide → 201 + token', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'user@test.local', password: 'Secret123!', full_name: 'Test User' });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.token, 'token attendu');
    userToken = res.body.token;
  });

  test('register mot de passe trop court → 422', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'weak@test.local', password: '123', full_name: 'X' });
    assert.strictEqual(res.status, 422);
  });

  test('register email déjà utilisé → 409', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'user@test.local', password: 'Secret123!', full_name: 'Dup' });
    assert.strictEqual(res.status, 409);
  });

  test('login mauvais mot de passe → 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'user@test.local', password: 'wrong' });
    assert.strictEqual(res.status, 401);
  });

  test('/me sans token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
  });

  test('/me avec token → 200', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.email, 'user@test.local');
  });
});

describe('Listings', () => {
  test('recherche publique → 200 + pagination', async () => {
    const res = await request(app).get('/api/listings');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.pagination);
  });

  test('Q5: ?limit=99999 plafonné à 50', async () => {
    const res = await request(app).get('/api/listings?limit=99999');
    assert.strictEqual(res.body.pagination.limit, 50);
  });

  test('création sans token → 401', async () => {
    const res = await request(app).post('/api/listings')
      .send({ title_fr: 'X', category_id: 6, wilaya_id: 16 });
    assert.strictEqual(res.status, 401);
  });

  test('création valide → 201 (status pending)', async () => {
    const res = await request(app).post('/api/listings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title_fr: 'Pelle mécanique', category_id: 6, wilaya_id: 16, price: 50000, currency: 'DZD' });
    assert.strictEqual(res.status, 201);
  });

  test('création devise invalide → 422', async () => {
    const res = await request(app).post('/api/listings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title_fr: 'X', category_id: 6, wilaya_id: 16, currency: 'USD' });
    assert.strictEqual(res.status, 422);
  });

  test('détail introuvable → 404', async () => {
    const res = await request(app).get('/api/listings/does-not-exist');
    assert.strictEqual(res.status, 404);
  });

  test('Q4: recherche FTS trouve une annonce active (insensible aux accents)', async () => {
    // L'admin publie une annonce active (la recherche ne renvoie que status=active)
    const create = await request(app).post('/api/admin/listings/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_id: 6, title_fr: 'Bétonnière Zxqw professionnelle', wilaya_id: 16,
              price: 1, seller_name: 'Vendeur', seller_phone: '0555000111' });
    assert.strictEqual(create.status, 201);

    // Recherche sans accent + préfixe → doit la retrouver (trigger FTS + diacritics)
    const res = await request(app).get('/api/listings?q=betonniere');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.some(l => /Zxqw/.test(l.title_fr)), 'annonce attendue dans les résultats FTS');

    // Un terme absent ne la renvoie pas
    const none = await request(app).get('/api/listings?q=zzzunlikelyterm');
    assert.ok(!none.body.data.some(l => /Zxqw/.test(l.title_fr)));
  });
});

describe('Permissions & sécurité', () => {
  test('admin/stats sans token → 401', async () => {
    const res = await request(app).get('/api/admin/stats');
    assert.strictEqual(res.status, 401);
  });

  test('admin/stats avec user non-admin → 403', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(res.status, 403);
  });

  test('admin/stats avec admin → 200', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.total_users === 'number');
  });

  test('S4: /api/exa/search non authentifié → 401', async () => {
    const res = await request(app).post('/api/exa/search').send({ query: 'x' });
    assert.strictEqual(res.status, 401);
  });

  test('health → 200', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });
});
