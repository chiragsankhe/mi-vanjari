import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { get } from '../lib/api';
import { disconnectSocket, getSocket } from '../lib/socket';
import { useAuth } from '../store/auth';

export function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/**
 * Infinite list over a `{ items, page, hasMore, total }` endpoint.
 * Returns flattened `items` plus react-query state.
 */
export function usePaged(key, url, params = {}, options = {}) {
  const q = useInfiniteQuery({
    queryKey: [...key, params],
    queryFn: ({ pageParam = 1 }) => get(url, { ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    ...options,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;
  return { ...q, items, total };
}

/**
 * Screenshot / screen-recording deterrence for sensitive screens (chat, profile detail).
 * Browsers cannot truly block screenshots — this blurs the page on PrintScreen, when the tab is
 * hidden or the window loses focus, and disables copy / context menu on protected content.
 */
export function useScreenshotGuard(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const blur = (ms) => {
      document.body.classList.add('privacy-blur');
      if (ms) setTimeout(() => document.body.classList.remove('privacy-blur'), ms);
    };
    const unblur = () => document.body.classList.remove('privacy-blur');

    const onKey = (e) => {
      const k = e.key;
      if (k === 'PrintScreen' || e.keyCode === 44) {
        blur(2000);
        navigator.clipboard?.writeText?.('').catch(() => {});
        toast.warning('Screenshots are disabled here to protect member privacy.');
      }
      // macOS screenshot shortcuts (Cmd+Shift+3/4/5) & Windows snipping (Win+Shift+S)
      if ((e.metaKey && e.shiftKey && ['3', '4', '5', 's', 'S'].includes(k)) || (e.ctrlKey && k === 'p')) {
        e.preventDefault?.();
        blur(2000);
      }
    };
    const onVisibility = () => (document.hidden ? blur() : unblur());
    const onBlur = () => blur();
    const onFocus = () => unblur();
    const prevent = (e) => {
      if (e.target.closest?.('.protected')) e.preventDefault();
    };

    document.addEventListener('keyup', onKey);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('dragstart', prevent);
    return () => {
      unblur();
      document.removeEventListener('keyup', onKey);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('dragstart', prevent);
    };
  }, [enabled]);
}

/** Global real-time listeners: badges, toasts and cache invalidation. Mounted once in the layout. */
export function useRealtime() {
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.user?.id);
  const qc = useQueryClient();

  useEffect(() => {
    if (status !== 'authed') {
      disconnectSocket();
      return;
    }
    const socket = getSocket();
    if (!socket) return;

    const refreshUnread = () => get('/notifications/unread').then((u) => useAuth.getState().patchUnread(u)).catch(() => {});

    const onNotification = (n) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      refreshUnread();
      if (n.type !== 'MESSAGE') toast(n.content, { icon: '🔔' });
    };
    const onMessage = (m) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (m.receiverId === userId && !window.location.pathname.includes(m.conversationId)) {
        refreshUnread();
      }
    };
    const onFollowRequest = () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      refreshUnread();
    };
    const onFollowAccepted = () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['browse'] });
    };

    socket.on('notification', onNotification);
    socket.on('new_message', onMessage);
    socket.on('follow_request', onFollowRequest);
    socket.on('follow_accepted', onFollowAccepted);
    return () => {
      socket.off('notification', onNotification);
      socket.off('new_message', onMessage);
      socket.off('follow_request', onFollowRequest);
      socket.off('follow_accepted', onFollowAccepted);
    };
  }, [status, userId, qc]);
}

/** Scroll to top on route change. */
export function useScrollTop(dep) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [dep]);
}
