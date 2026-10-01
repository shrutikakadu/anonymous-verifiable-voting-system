const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidVoterId = (voterId) => typeof voterId === 'string' && voterId.trim().length >= 3;

const isStrongPassword = (password) => typeof password === 'string' && password.length >= 8;

module.exports = {
  isValidEmail,
  isValidVoterId,
  isStrongPassword,
};
