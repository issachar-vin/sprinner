import { useTheme } from './useTheme';
import type { ThemePreference } from './useTheme';

const LABELS: Record<ThemePreference, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

export function ThemeToggle() {
  const { preference, choose, options } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={preference === option}
          onClick={() => choose(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
