
 // Runs authentication tests without a real MongoDB database.

const assert = require('node:assert/strict');
const { createRequire } = require('node:module');

const backendRequire = createRequire(
  require.resolve('../backend/package.json')
);

const jwt = backendRequire('jsonwebtoken');
const request = backendRequire('supertest');

const Voter = require('../backend/models/Voter');
const RevokedToken = require('../backend/models/RevokedToken');
const { jwtSecret } = require('../backend/config/keys');

const voters = new Map();
const revoked = new Set();

let lastOTP = null;
const oldLog = console.log;
// Explicit mail double: this smoke test never sends Gmail or logs OTP values.
const nodemailer = backendRequire('nodemailer');
const originalTransport = nodemailer.createTransport;
const originalEmail = process.env.OTP_EMAIL;
const originalPassword = process.env.OTP_EMAIL_PASSWORD;
process.env.OTP_EMAIL = 'smoke@example.test';
process.env.OTP_EMAIL_PASSWORD = 'synthetic-mail-credential';
nodemailer.createTransport = () => ({ sendMail: async (mail) => {
  lastOTP = mail.text.match(/code is (\d{6})/)[1];
  return { accepted: [mail.to] };
} });

const findVoter = (filter) => {
  if (filter.$or) {
    return [...voters.values()].find(v =>
      filter.$or.some(term =>
        (term.voterId && term.voterId === v.voterId) ||
        (term.email && term.email === v.email)
      )
    ) || null;
  }

  return voters.get(filter.voterId) || null;
};

Voter.findOne = (filter) => ({
  then(resolve, reject) {
    return Promise.resolve(findVoter(filter)).then(resolve, reject);
  },

  select() {
    return Promise.resolve(findVoter(filter));
  },
});

Voter.create = async (props) => {
  const voter = {
    ...props,

    _id: {
      toString() {
        return String(props.voterId);
      },
    },

    emailVerified: false,
    otpVerified: false,
    otpPurpose: null,
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    otpLastSentAt: null,
    otpLastPurpose: null,

    async save() {
      return this;
    },
  };

  voters.set(voter.voterId, voter);

  return voter;
};

Voter.findById = (id) => ({
  select() {
    return Promise.resolve(
      [...voters.values()].find(
        v => v._id.toString() === String(id)
      )
    );
  },
});

RevokedToken.exists = async ({ tokenHash }) => {
  return revoked.has(tokenHash);
};

RevokedToken.updateOne = async ({ tokenHash }) => {
  revoked.add(tokenHash);

  return { acknowledged: true };
};

const app = require('../backend/app');
const http = request(app);

const expectStatus = (response, status, label) => {
  assert.equal(
    response.status,
    status,
    `${label}: ${JSON.stringify(response.body)}`
  );

  oldLog(`PASS ${label}`);
};

(async () => {
  try {

    // TEST 1: Voter registration

    let res = await http.post('/api/auth/register').send({
      name: 'Demo Voter',
      voterId: 'test001',
      email: 'demo@example.com',
      password: 'Test@12345',
    });

    expectStatus(res, 201, 'registration saved and OTP generated');

    assert.equal(res.body.otpSent, true);
    assert.equal(voters.get('TEST001').emailVerified, false);

    const registrationOTP = lastOTP;

    assert.match(registrationOTP, /^\d{6}$/);
    assert.notEqual(voters.get('TEST001').otpHash, registrationOTP);


    // TEST 2: Login before registration OTP

    res = await http.post('/api/auth/login').send({
      voterId: 'TEST001',
      password: 'Test@12345',
    });

    expectStatus(res, 403, 'login denied before registration OTP');


    // TEST 3: Registration OTP cannot be used for login

    res = await http.post('/api/auth/verify-otp').send({
      voterId: 'TEST001',
      otpCode: registrationOTP,
      purpose: 'login',
    });

    expectStatus(res, 401, 'registration code cannot be used for login');


    // TEST 4: Registration OTP verification

    res = await http.post('/api/auth/verify-otp').send({
      voterId: 'TEST001',
      otpCode: registrationOTP,
      purpose: 'registration',
    });

    expectStatus(res, 200, 'registration OTP verified');

    assert.equal(res.body.token, undefined);
    assert.equal(voters.get('TEST001').emailVerified, true);


    // TEST 5: Password login generates new OTP

    res = await http.post('/api/auth/login').send({
      voterId: 'TEST001',
      password: 'Test@12345',
    });

    expectStatus(res, 200, 'password accepted, new login OTP sent');

    assert.equal(res.body.token, undefined);

    const loginOTP = lastOTP;


    // TEST 6: Wrong OTP rejection

    const wrongOTP = loginOTP === '000000' ? '111111' : '000000';

    res = await http.post('/api/auth/verify-otp').send({
      voterId: 'TEST001',
      otpCode: wrongOTP,
      purpose: 'login',
    });

    expectStatus(res, 401, 'incorrect login OTP rejected');


    // TEST 7: Correct OTP and JWT generation

    res = await http.post('/api/auth/verify-otp').send({
      voterId: 'TEST001',
      otpCode: loginOTP,
      purpose: 'login',
    });

    expectStatus(res, 200, 'correct login OTP accepted');

    assert.equal(jwt.verify(res.body.token, jwtSecret).otp, true);

    const token = res.body.token;


    // TEST 8: OTP reuse prevention

    res = await http.post('/api/auth/verify-otp').send({
      voterId: 'TEST001',
      otpCode: loginOTP,
      purpose: 'login',
    });

    expectStatus(res, 401, 'OTP cannot be reused');


    // TEST 9: Valid JWT allows protected API access

    res = await http.get('/api/voter/profile')
      .set('Authorization', `Bearer ${token}`);

    expectStatus(res, 200, 'protected API accepts full JWT');

    assert.equal(res.body.voter.email, 'demo@example.com');


    // TEST 10: Fake JWT rejection

    res = await http.get('/api/voter/profile')
      .set('Authorization', 'Bearer fake.invalid.token');

    expectStatus(res, 401, 'fake JWT rejected');


    // TEST 11: Logout revokes JWT

    res = await http.post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expectStatus(res, 200, 'logout revokes JWT');


    // TEST 12: Revoked JWT cannot access protected API

    res = await http.get('/api/voter/profile')
      .set('Authorization', `Bearer ${token}`);

    expectStatus(res, 401, 'revoked JWT denied');


    oldLog('ALL MODULE 2 SMOKE TESTS PASSED');

  } catch (err) {
    console.error(err);
    process.exitCode = 1;

  } finally {
    nodemailer.createTransport = originalTransport;
    if (originalEmail === undefined) delete process.env.OTP_EMAIL;
    else process.env.OTP_EMAIL = originalEmail;
    if (originalPassword === undefined) delete process.env.OTP_EMAIL_PASSWORD;
    else process.env.OTP_EMAIL_PASSWORD = originalPassword;
  }
})();
