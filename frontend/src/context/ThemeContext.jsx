import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyMode, getStoredMode, storeMode } from '../utils/theme';

const ThemeContext = createContext({ mode: 'system', setMode: () => {} });

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(getStoredMode);

  const setMode = useCallback((next) => {
    storeMode(next);
    applyMode(next);
    setModeState(next);
  }, []);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
