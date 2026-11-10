import { create } from 'zustand';

/**
 * Auth store. `status`: 'loading' (restoring session) → 'authed' | 'guest'.
 * The access token is kept in memory only (never localStorage) to limit XSS exposure.
 */
export const useAuth = create((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authed' }),
  setUser: (user) => set((s) => ({ user: typeof user === 'function' ? user(s.user) : user })),
  patchUnread: (patch) => set((s) => (s.user ? { user: { ...s.user, unread: { ...s.user.unread, ...patch } } } : {})),
  clear: () => set({ accessToken: null, user: null, status: 'guest' }),
}));

export const useUser = () => useAuth((s) => s.user);
export const useIsAuthed = () => useAuth((s) => s.status === 'authed');
