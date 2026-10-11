/**
 * tests/security/unauthorizedAdmin.test.js
 * -----------------------------------------
 * Part 10: Security Tests — Role-Based Access Control & Admin Protection
 *
 * Validates Cryptography & Network Security (CNS) Concepts:
 *  - Role-Based Access Control (RBAC)
 *  - Authentication & Authorization Verification (JWT claims validation)
 *  - Resistance to Privilege Escalation (Voter cannot access admin endpoints)
 *  - Forged and Expired Token Rejection
 *  - Protection of Sensitive Administrative Operations (Tally and Dashboard)
 */

'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ── Mock Mongoose models ─────────────────────────────────────────────────────
jest.mock('../../backend/models/Admin');
jest.mock('../../backend/models/Vote');

const Admin = require('../../backend/models/Admin');
const Vote = require('../../backend/models/Vote');

const app = require('../../backend/app');
const { jwtSecret } = require('../../backend/config/keys');

describe('Security Tests: Role-Based Access Control & Admin Protection', () => {
  const adminId = 'admin_mongo_id_001';
  const voterId = 'voter_mongo_id_002';
  const validAesKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  let validAdminJwt;
  let validVoterJwt;
  let expiredAdminJwt;
  let forgedAdminJwt;

  beforeAll(() => {
    process.env.AES_SECRET_KEY = validAesKey;

    // Genuine admin token
    validAdminJwt = jwt.sign(
      { sub: adminId, role: 'admin', username: 'chief_election_admin' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Regular voter token
    validVoterJwt = jwt.sign(
      { sub: voterId, role: 'voter', voterId: 'VOTER_100' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Expired admin token
    expiredAdminJwt = jwt.sign(
      { sub: adminId, role: 'admin', username: 'chief_election_admin' },
      jwtSecret,
      { expiresIn: '-1s' }
    );

    // Forged token: claims role 'admin' but signed with attacker secret key
    forgedAdminJwt = jwt.sign(
      { sub: 'attacker_id', role: 'admin', username: 'fake_admin' },
      'attacker_compromised_secret_key_123',
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Vote.find.mockResolvedValue([]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Unauthenticated Requests to Protected Routes
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Unauthenticated Requests (No Token / Bad Headers)', () => {
    it('❌ Rejects GET /api/admin/dashboard when Authorization header is missing (HTTP 401)', async () => {
      const res = await request(app).get('/api/admin/dashboard');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Missing or invalid JWT');
    });

    it('❌ Rejects POST /api/admin/tally when Authorization header is missing (HTTP 401)', async () => {
      const res = await request(app).post('/api/admin/tally');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Missing or invalid JWT');
    });

    it('❌ Rejects request when Authorization header lacks Bearer scheme (HTTP 401)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Basic ${validAdminJwt}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Missing or invalid JWT');
    });

    it('❌ Rejects unauthenticated voter-facing protected routes as well (HTTP 401)', async () => {
      const protectedEndpoints = [
        { method: 'post', path: '/api/token/generate' },
        { method: 'post', path: '/api/token/verify' },
        { method: 'post', path: '/api/token/mark-used' },
        { method: 'post', path: '/api/vote/cast' },
        { method: 'get', path: '/api/voter/profile' },
        { method: 'post', path: '/api/auth/logout' },
      ];

      for (const endpoint of protectedEndpoints) {
        const res = await request(app)[endpoint.method](endpoint.path);
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Missing or invalid JWT');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Privilege Escalation & Role-Based Access Control (RBAC)
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Role-Based Access Control (Voter attempting Admin operations)', () => {
    it('❌ Blocks regular voter from accessing GET /api/admin/dashboard (HTTP 403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${validVoterJwt}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Admin access required');
    });

    it('❌ Blocks regular voter from accessing POST /api/admin/tally (HTTP 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/admin/tally')
        .set('Authorization', `Bearer ${validVoterJwt}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Admin access required');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Forged and Expired JWT Token Handling
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Token Forgery & Expiration Rejection', () => {
    it('❌ Rejects attacker-forged admin token signed with illegitimate key (HTTP 401)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${forgedAdminJwt}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired JWT');
    });

    it('❌ Rejects expired admin JWT token (HTTP 401)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${expiredAdminJwt}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired JWT');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Admin Login Authentication Endpoint (POST /api/admin/login)
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Admin Login Endpoint Security', () => {
    it('❌ Rejects login attempt with incorrect admin password (HTTP 401)', async () => {
      const storedHash = await bcrypt.hash('CorrectAdminPassword123', 10);
      Admin.findOne.mockResolvedValue({
        _id: adminId,
        username: 'election_admin',
        passwordHash: storedHash,
        role: 'admin',
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'election_admin', password: 'WrongPassword999' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid admin credentials');
    });

    it('❌ Rejects login attempt for non-existent admin username (HTTP 401)', async () => {
      Admin.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'unknown_admin', password: 'SomePassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid admin credentials');
    });

    it('❌ Returns HTTP 400 when admin login fields are missing', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Username and password required');
    });

    it('✅ Grants access and returns JWT token for authentic admin credentials', async () => {
      const storedHash = await bcrypt.hash('CorrectAdminPassword123', 10);
      Admin.findOne.mockResolvedValue({
        _id: adminId,
        username: 'election_admin',
        passwordHash: storedHash,
        role: 'admin',
      });

      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'election_admin', password: 'CorrectAdminPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.message).toBe('Admin login successful');

      // Verify token decoded claims
      const decoded = jwt.verify(res.body.token, jwtSecret);
      expect(decoded.role).toBe('admin');
      expect(decoded.username).toBe('election_admin');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Authorized Admin Access
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Authorized Admin Operations', () => {
    it('✅ Allows authentic admin to view dashboard (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${validAdminJwt}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Admin dashboard data');
      expect(res.body.totalVotes).toBe(0);
    });

    it('✅ Allows authentic admin to run vote tally (HTTP 200)', async () => {
      const res = await request(app)
        .post('/api/admin/tally')
        .set('Authorization', `Bearer ${validAdminJwt}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Secure tally complete');
    });
  });
});
