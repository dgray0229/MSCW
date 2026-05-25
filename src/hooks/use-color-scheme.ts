import { useAppStore } from '../store';

export function useColorScheme() {
  const darkMode = useAppStore((state) => state.settings.darkMode);
  return darkMode ? 'dark' : 'light';
}
