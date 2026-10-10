module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'development_secret',
  port: process.env.PORT || 5000,
  rsaPrivateKeyPath: process.env.RSA_PRIVATE_KEY_PATH || './keys/private.pem',
  rsaPublicKeyPath: process.env.RSA_PUBLIC_KEY_PATH || './keys/public.pem',
  aesSecretKey: process.env.AES_SECRET_KEY,
};
