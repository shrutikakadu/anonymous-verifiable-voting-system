// Real auth routes, bcrypt, OTP service and Mongoose documents; isolated repository
// and mail transport doubles. This does not test a running MongoDB or inbox.
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
const nodemailer = require('nodemailer');
const Voter = require('../../backend/models/Voter');
const app = require('../../backend/app');
const { jwtSecret } = require('../../backend/config/keys');
const { sendOTP } = require('../../backend/services/otpService');

const credentials = { voterId: 'AUTH_TEST', password: 'Synthetic password 123' };
const registration = { ...credentials, name: 'Test Voter', email: 'auth@example.test' };
const originalEnv = { ...process.env };
let voters;
let sendMail;
let selections;

const post = (path, body) => request(app).post(`/api/auth/${path}`).send(body);
const lastCode = () => sendMail.mock.calls.at(-1)[0].text.match(/code is (\d{6})/)[1];
const stored = () => voters.get(credentials.voterId);
const allowResend = () => { stored().otpLastSentAt = new Date(Date.now() - 61000); };
const register = () => post('register', registration);
const verify = (purpose, otpCode = lastCode()) => post('verify-otp', {
  voterId: credentials.voterId, purpose, otpCode,
});
const verifiedRegistration = async () => {
  expect((await register()).status).toBe(201);
  expect((await verify('registration')).status).toBe(200);
};

beforeEach(() => {
  jest.clearAllMocks();
  voters = new Map();
  selections = [];
  process.env.OTP_EMAIL = 'sender@example.test';
  process.env.OTP_EMAIL_PASSWORD = 'synthetic-mail-credential';
  sendMail = jest.fn().mockResolvedValue({ accepted: [registration.email] });
  nodemailer.createTransport.mockReturnValue({ sendMail });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(Voter, 'findOne').mockImplementation((filter) => {
    const voter = [...voters.values()].find((entry) => filter.$or
      ? filter.$or.some((term) => Object.entries(term).every(([k, v]) => entry[k] === v))
      : entry.voterId === filter.voterId) || null;
    return {
      then: (resolve, reject) => Promise.resolve(voter).then(resolve, reject),
      select: (fields) => { selections.push(fields); return Promise.resolve(voter); },
    };
  });
  jest.spyOn(Voter, 'create').mockImplementation(async (props) => {
    const voter = new Voter(props);
    await voter.validate();
    voter.save = jest.fn().mockResolvedValue(voter);
    voters.set(voter.voterId, voter);
    return voter;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const key of ['OTP_EMAIL', 'OTP_EMAIL_PASSWORD', 'NODE_ENV']) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test('normalized registration, hashed credentials, registration verification, password and login OTP produce a JWT', async () => {
  const response = await post('register', {
    ...registration, voterId: ' auth_test ', email: ' AUTH@EXAMPLE.TEST ',
  });
  expect(response.status).toBe(201);
  expect(response.body.otpSent).toBe(true);
  expect(response.body.voter).toMatchObject({ voterId: credentials.voterId, email: registration.email });
  expect(response.body.voter.passwordHash).toBeUndefined();
  expect(stored().passwordHash).not.toBe(credentials.password);
  expect(await bcrypt.compare(credentials.password, stored().passwordHash)).toBe(true);
  expect(lastCode()).toMatch(/^\d{6}$/);
  expect(stored().otpHash).not.toBe(lastCode());
  expect(await bcrypt.compare(lastCode(), stored().otpHash)).toBe(true);
  expect(stored().otpExpiresAt.getTime() - Date.now()).toBeGreaterThan(290000);
  expect(stored().otpExpiresAt.getTime() - Date.now()).toBeLessThanOrEqual(300000);
  const registrationResult = await verify('registration');
  expect(registrationResult.status).toBe(200);
  expect(registrationResult.body.token).toBeUndefined();
  expect(stored().emailVerified).toBe(true);
  const login = await post('login', { ...credentials, voterId: ' auth_test ' });
  expect(login.status).toBe(200);
  expect(login.body.token).toBeUndefined();
  expect(selections).toContain('+passwordHash');
  const verified = await verify('login');
  expect(verified.status).toBe(200);
  expect(jwt.verify(verified.body.token, jwtSecret)).toMatchObject({
    sub: stored()._id.toString(), voterId: credentials.voterId, role: 'voter', otp: true,
  });
  expect(stored().otpVerified).toBe(true);
  expect(stored().otpHash).toBeNull();
});

test('unknown voter and wrong password receive the same generic rejection', async () => {
  await verifiedRegistration();
  const wrong = await post('login', { ...credentials, password: 'Wrong password' });
  const unknown = await post('login', { ...credentials, voterId: 'UNKNOWN' });
  expect(wrong.status).toBe(401);
  expect(unknown.status).toBe(401);
  expect(wrong.body).toEqual(unknown.body);
  expect(sendMail).toHaveBeenCalledTimes(1);
});

test('login before registration verification is denied without issuing another OTP', async () => {
  await register();
  expect((await post('login', credentials)).status).toBe(403);
  expect(sendMail).toHaveBeenCalledTimes(1);
});

test.each([
  ['voter ID', { email: 'other@example.test' }],
  ['email', { voterId: 'OTHER_VOTER' }],
])('duplicate %s is rejected without overwriting the account', async (_label, change) => {
  await register();
  const original = stored().toObject();
  const result = await post('register', { ...registration, ...change, password: 'Replacement password' });
  expect(result.status).toBe(409);
  expect(Voter.create).toHaveBeenCalledTimes(1);
  expect(stored().toObject()).toEqual(original);
});

test('unique-index conflict is returned safely', async () => {
  Voter.create.mockRejectedValueOnce(Object.assign(new Error('duplicate key'), { code: 11000 }));
  expect((await register()).status).toBe(409);
});

test('resume unverified registration requires the original password and preserves the account', async () => {
  await register();
  const passwordHash = stored().passwordHash;
  allowResend();
  expect((await post('resend-registration-otp', { ...credentials, password: 'Wrong password' })).status).toBe(401);
  expect(sendMail).toHaveBeenCalledTimes(1);
  expect((await post('resend-registration-otp', { ...credentials, voterId: ' auth_test ' })).status).toBe(200);
  expect(Voter.create).toHaveBeenCalledTimes(1);
  expect(stored().passwordHash).toBe(passwordHash);
  expect((await verify('registration')).status).toBe(200);
});

test('verified accounts cannot be overwritten or sent another registration OTP', async () => {
  await verifiedRegistration();
  const originalHash = stored().passwordHash;
  expect((await post('resend-registration-otp', credentials)).status).toBe(409);
  expect((await register()).status).toBe(409);
  expect(sendMail).toHaveBeenCalledTimes(1);
  expect(stored().passwordHash).toBe(originalHash);
});

test('registration resend and login OTP generation enforce the existing cooldown', async () => {
  await register();
  expect((await post('resend-registration-otp', credentials)).status).toBe(429);
  await verify('registration');
  expect((await post('login', credentials)).status).toBe(200);
  expect((await post('login', credentials)).status).toBe(429);
});

test('OTP purposes cannot be interchanged', async () => {
  await register();
  expect((await verify('login')).status).toBe(401);
  expect((await verify('registration')).status).toBe(200);
  await post('login', credentials);
  expect((await verify('registration')).status).toBe(401);
  expect((await verify('login')).status).toBe(200);
});

test('expired OTP is rejected and consumed', async () => {
  await register();
  stored().otpExpiresAt = new Date(Date.now() - 1);
  expect((await verify('registration')).status).toBe(401);
  expect(stored().otpHash).toBeNull();
  expect(stored().emailVerified).toBe(false);
});

test('five incorrect attempts exhaust the OTP without authenticating', async () => {
  await register();
  const code = lastCode();
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i += 1) expect((await verify('registration', wrong)).status).toBe(401);
  expect((await verify('registration', code)).status).toBe(401);
  expect(stored().otpAttempts).toBe(5);
  expect(stored().otpHash).toBeNull();
  expect(stored().emailVerified).toBe(false);
});

test.each(['registration', 'login'])('%s OTP cannot be replayed after sequential verification', async (purpose) => {
  await register();
  if (purpose === 'login') {
    await verify('registration');
    await post('login', credentials);
  }
  const code = lastCode();
  expect((await verify(purpose, code)).status).toBe(200);
  expect((await verify(purpose, code)).status).toBe(401);
});

test('SMTP failure preserves registration and permits password-protected recovery after cooldown', async () => {
  sendMail.mockRejectedValueOnce(new Error('synthetic SMTP failure'));
  const result = await register();
  expect(result.status).toBe(201);
  expect(result.body.otpSent).toBe(false);
  expect(stored().emailVerified).toBe(false);
  allowResend();
  expect((await post('resend-registration-otp', credentials)).status).toBe(200);
  expect((await verify('registration')).status).toBe(200);
});

test('login and recovery delivery failures are reported without issuing a JWT', async () => {
  await register();
  allowResend();
  sendMail.mockRejectedValueOnce(new Error('synthetic SMTP failure'));
  expect((await post('resend-registration-otp', credentials)).status).toBe(503);
  await verify('registration');
  sendMail.mockRejectedValueOnce(new Error('synthetic SMTP failure'));
  const result = await post('login', credentials);
  expect(result.status).toBe(503);
  expect(result.body.token).toBeUndefined();
});

test('missing SMTP credentials uses development logging but fails closed in production', async () => {
  delete process.env.OTP_EMAIL;
  delete process.env.OTP_EMAIL_PASSWORD;
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  process.env.NODE_ENV = 'development';
  await sendOTP(registration.email, '123456', 'registration');
  expect(log).toHaveBeenCalledTimes(1);
  expect(nodemailer.createTransport).not.toHaveBeenCalled();
  process.env.NODE_ENV = 'production';
  await expect(sendOTP(registration.email, '123456', 'registration')).rejects.toThrow('not configured');
  expect(log).toHaveBeenCalledTimes(1);
});

test('schema keeps password and OTP hashes hidden and both voter ID and email unique', () => {
  expect(Voter.schema.path('passwordHash').options.select).toBe(false);
  expect(Voter.schema.path('otpHash').options.select).toBe(false);
  expect(Voter.schema.path('voterId').options.unique).toBe(true);
  expect(Voter.schema.path('email').options.unique).toBe(true);
});
