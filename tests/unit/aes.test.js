const { encryptAES, decryptAES } = require('../../backend/crypto/aes');

describe('AES utility', () => {
  it('encrypts and decrypts a plaintext payload', () => {
    const secretKey = '12345678901234567890123456789012';
    const iv = '1234567890123456';
    const plaintext = JSON.stringify({ candidateId: 'c1', choice: 'A' });

    const encrypted = encryptAES(plaintext, secretKey, iv);
    const decrypted = decryptAES(encrypted, secretKey, iv);

    expect(decrypted).toBe(plaintext);
  });
});
