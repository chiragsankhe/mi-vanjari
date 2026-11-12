import { create } from 'zustand';

const LANG_KEY = 'mv_lang';
const readLang = () => {
  try {
    return localStorage.getItem(LANG_KEY) || 'en';
  } catch {
    return 'en';
  }
};

/** UI store: language, auth dialog, etc. */
export const useUI = create((set) => ({
  lang: readLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
    set({ lang });
  },
  toggleLang: () =>
    set((s) => {
      const lang = s.lang === 'mr' ? 'en' : 'mr';
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = lang;
      return { lang };
    }),

  authOpen: false,
  authRedirect: null,
  authMode: 'login',
  openAuth: (redirect = null, mode = 'login') => set({ authOpen: true, authRedirect: redirect, authMode: mode }),
  closeAuth: () => set({ authOpen: false, authRedirect: null }),
}));
