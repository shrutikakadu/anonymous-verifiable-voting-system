const { generateRSAKeyPair, signWithPrivateKey, verifyWithPublicKey } = require('../../backend/crypto/rsa');

describe('RSA utility', () => {
  it('signs and verifies a message', () => {
    const { publicKey, privateKey } = generateRSAKeyPair();
    const message = 'vote-token-123';
    const signature = signWithPrivateKey(message, privateKey);

    expect(verifyWithPublicKey(message, signature, publicKey)).toBe(true);
  });
});
