export const saveToken = (token) => localStorage.setItem('token', token);
export const saveRole = (role) => localStorage.setItem('role', role);
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
};
