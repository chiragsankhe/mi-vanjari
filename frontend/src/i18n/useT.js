import { useCallback } from 'react';
import { useUI } from '../store/ui';
import { strings } from './strings';

/** const t = useT(); t('nav_home') */
export function useT() {
  const lang = useUI((s) => s.lang);
  return useCallback((key) => strings[lang]?.[key] ?? strings.en[key] ?? key, [lang]);
}
