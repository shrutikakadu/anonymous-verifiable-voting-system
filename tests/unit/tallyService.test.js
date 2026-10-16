
'use strict';

jest.mock('../../backend/models/Vote', () => ({
  find: jest.fn()
}));

jest.mock('../../backend/crypto/aes', () => ({
  decryptAES: jest.fn()
}));

const Vote = require('../../backend/models/Vote');
const { decryptAES } = require('../../backend/crypto/aes');
const { getTallyResults } = require('../../backend/services/tallyService');

const VALID_AES_KEY = 'a'.repeat(64);
const ORIGINAL_AES_KEY = process.env.AES_SECRET_KEY;

const mockVotes = (votes) => {
  const lean = jest.fn().mockResolvedValue(votes);
  Vote.find.mockReturnValue({ lean });
  return lean;
};

describe('Secure tally service', () => {
  beforeEach(() => {
    process.env.AES_SECRET_KEY = VALID_AES_KEY;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (ORIGINAL_AES_KEY === undefined) {
      delete process.env.AES_SECRET_KEY;
    } else {
      process.env.AES_SECRET_KEY = ORIGINAL_AES_KEY;
    }
  });

  test('counts valid decrypted votes by candidate', async () => {
    const votes = [
      { _id: 'v1', encryptedVote: 'enc1', iv: 'iv1', authTag: 'tag1' },
      { _id: 'v2', encryptedVote: 'enc2', iv: 'iv2', authTag: 'tag2' },
      { _id: 'v3', encryptedVote: 'enc3', iv: 'iv3', authTag: 'tag3' }
    ];

    mockVotes(votes);

    const payloads = {
      enc1: { candidateId: 'c1' },
      enc2: { candidateId: 'c2' },
      enc3: { candidateId: 'c1' }
    };

    decryptAES.mockImplementation(({ encryptedVote }) =>
      JSON.stringify(payloads[encryptedVote])
    );

    const result = await getTallyResults();

    expect(result).toEqual({
      totalVotes: 3,
      talliedVotes: 3,
      rejectedVotes: 0,
      candidateResults: { c1: 2, c2: 1 }
    });

    expect(Vote.find).toHaveBeenCalledWith(
      {},
      'encryptedVote iv authTag'
    );

    expect(decryptAES).toHaveBeenCalledTimes(3);
  });

  test('rejects a ballot when AES-GCM decryption fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      mockVotes([
        { _id: 'v1', encryptedVote: 'tampered', iv: 'iv1', authTag: 'bad' },
        { _id: 'v2', encryptedVote: 'valid', iv: 'iv2', authTag: 'tag2' }
      ]);

      decryptAES.mockImplementation(({ encryptedVote }) => {
        if (encryptedVote === 'tampered') {
          throw new Error('Authentication tag mismatch');
        }

        return JSON.stringify({ candidateId: 'c1' });
      });

      const result = await getTallyResults();

      expect(result).toEqual({
        totalVotes: 2,
        talliedVotes: 1,
        rejectedVotes: 1,
        candidateResults: { c1: 1 }
      });

      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('rejects malformed JSON and missing candidate IDs', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      mockVotes([
        { _id: 'v1', encryptedVote: 'bad-json', iv: 'iv1', authTag: 'tag1' },
        { _id: 'v2', encryptedVote: 'missing-id', iv: 'iv2', authTag: 'tag2' },
        { _id: 'v3', encryptedVote: 'array', iv: 'iv3', authTag: 'tag3' }
      ]);

      decryptAES.mockImplementation(({ encryptedVote }) => {
        if (encryptedVote === 'bad-json') return '{invalid JSON';
        if (encryptedVote === 'missing-id') {
          return JSON.stringify({ choice: 'c1' });
        }

        return JSON.stringify([{ candidateId: 'c1' }]);
      });

      const result = await getTallyResults();

      expect(result).toEqual({
        totalVotes: 3,
        talliedVotes: 0,
        rejectedVotes: 3,
        candidateResults: {}
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('rejects an invalid AES key before querying votes', async () => {
    process.env.AES_SECRET_KEY = 'invalid-key';

    await expect(getTallyResults()).rejects.toThrow(
      'AES_SECRET_KEY must be a 64-character hexadecimal string.'
    );

    expect(Vote.find).not.toHaveBeenCalled();
  });

  
test('rejects a decrypted ballot for an unknown candidate', async () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  try {
    mockVotes([
      {
        _id: 'v-invalid',
        encryptedVote: 'encrypted-invalid',
        iv: 'iv1',
        authTag: 'tag1'
      }
    ]);

    decryptAES.mockReturnValue(
      JSON.stringify({ candidateId: 'c4' })
    );

    const result = await getTallyResults();

    expect(result).toEqual({
      totalVotes: 1,
      talliedVotes: 0,
      rejectedVotes: 1,
      candidateResults: {}
    });
  } finally {
    warnSpy.mockRestore();
  }
});

});
