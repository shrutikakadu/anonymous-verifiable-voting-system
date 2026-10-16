import { useTheme } from '../context/ThemeContext';

const OPTIONS = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div className="v-theme" role="group" aria-label="Colour theme">
      {OPTIONS.map((option) => (
        <button key={option.value} type="button" aria-pressed={mode === option.value} onClick={() => setMode(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
