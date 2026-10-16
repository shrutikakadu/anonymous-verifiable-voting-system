// Theme preference: 'light', 'dark', or 'system' (follow the operating system).
// Not sensitive, so it is kept in localStorage and survives closing the tab.
const KEY = 'theme';

export const getStoredMode = () => {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
};

export const storeMode = (mode) => {
  try {
    if (mode === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {
    // Storage unavailable: the choice applies for this visit only.
  }
};

// No data-theme attribute means the CSS media query follows the system setting.
export const applyMode = (mode) => {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
  else root.removeAttribute('data-theme');
};
