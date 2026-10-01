export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const isValidVoterId = (voterId) => voterId && voterId.trim().length >= 3;
