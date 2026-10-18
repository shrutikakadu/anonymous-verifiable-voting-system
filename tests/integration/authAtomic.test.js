// Real Express, Mongoose document save/update filters, bcrypt and JWT.
// Only collection I/O is replaced with an isolated atomic in-process store.
const request = require('supertest');
const bcrypt = require('bcryptjs');
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
const nodemailer = require('nodemailer');
const Voter = require('../../backend/models/Voter');
const app = require('../../backend/app');
const { createOTPForVoter } = require('../../backend/services/otpService');
let record;
const snapshot = () => Voter.hydrate(JSON.parse(JSON.stringify(record)));
const same = (a, b) => a instanceof Date || b instanceof Date
  ? new Date(a).getTime() === new Date(b).getTime() : String(a) === String(b);
const matches = (filter) => Object.entries(filter).every(([key, value]) => {
  if (value && value.$gt !== undefined) return record[key] > value.$gt;
  if (value === null) return record[key] == null;
  return same(record[key], value);
});
const verify = () => request(app).post('/api/auth/verify-otp').send({
  voterId: 'ATOMIC_TEST', purpose: 'login', otpCode: '123456',
});
beforeEach(async () => {
  record = new Voter({
    name: 'Synthetic Voter', voterId: 'ATOMIC_TEST', email: 'atomic@example.test',
    passwordHash: await bcrypt.hash('Synthetic password', 4), emailVerified: true,
    otpHash: await bcrypt.hash('123456', 4), otpPurpose: 'login',
    otpExpiresAt: new Date(Date.now() + 60000),
  }).toObject();
  jest.spyOn(Voter, 'findOne').mockImplementation(() => ({ select: async () => snapshot() }));
  jest.spyOn(Voter.collection, 'updateOne').mockImplementation(async (filter, update) => {
    if (!matches(filter)) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    Object.assign(record, structuredClone(update.$set || {}));
    for (const [key, value] of Object.entries(update.$inc || {})) record[key] += value;
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('simultaneous use of the same login OTP issues exactly one JWT', async () => {
  const results = await Promise.all([verify(), verify()]);
  expect(results.map(r => r.status).sort()).toEqual([200, 401]);
  expect(results.filter(r => r.body.token)).toHaveLength(1);
  expect(record.otpHash).toBeNull();
  const filters = Voter.collection.updateOne.mock.calls.map(call => call[0]);
  expect(filters.every(filter => filter.otpHash && filter.otpPurpose === 'login')).toBe(true);
});

test('a stale verification cannot clear a replacement OTP', async () => {
  const stale = snapshot();
  record.otpHash = await bcrypt.hash('654321', 4);
  Voter.findOne.mockReturnValue({ select: async () => stale });
  expect((await verify()).status).toBe(401);
  expect(await bcrypt.compare('654321', record.otpHash)).toBe(true);
});

test('OTP expiry is checked again when verification is persisted', async () => {
  const originalCompare = bcrypt.compare;
  jest.spyOn(bcrypt, 'compare').mockImplementation(async (...args) => {
    const result = await originalCompare(...args);
    record.otpExpiresAt = new Date(Date.now() - 1);
    return result;
  });
  expect((await verify()).status).toBe(401);
});

test('parallel resends cannot bypass cooldown or send two conflicting codes', async () => {
  const originalEmail = process.env.OTP_EMAIL;
  const originalPassword = process.env.OTP_EMAIL_PASSWORD;
  process.env.OTP_EMAIL = 'atomic-sender@example.test';
  process.env.OTP_EMAIL_PASSWORD = 'synthetic-mail-credential';
  const sendMail = jest.fn().mockResolvedValue({ accepted: [record.email] });
  nodemailer.createTransport.mockReturnValue({ sendMail });
  try {
    const results = await Promise.allSettled([
      createOTPForVoter(snapshot(), 'login'), createOTPForVoter(snapshot(), 'login'),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(r => r.status === 'rejected').reason.status).toBe(429);
    expect(sendMail).toHaveBeenCalledTimes(1);
  } finally {
    if (originalEmail === undefined) delete process.env.OTP_EMAIL;
    else process.env.OTP_EMAIL = originalEmail;
    if (originalPassword === undefined) delete process.env.OTP_EMAIL_PASSWORD;
    else process.env.OTP_EMAIL_PASSWORD = originalPassword;
  }
});
