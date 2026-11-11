import { lazy } from 'react';

/**
 * Keeps the site working right after a new version goes live.
 *
 * Each page's code lives in its own file whose name changes on every deploy. A tab opened before the
 * deploy still asks for the old names; those files are gone, so the page would stay blank.
 * When that happens we reload once — the reload fetches the new version and opens the same page.
 * A short guard stops reload loops if something else is really broken.
 */
const KEY = 'mv_reloaded_for_update';
const GUARD_MS = 20_000;

export function isStaleVersionError(err) {
  const msg = String(err?.message || err || '');
  return /dynamically imported module|importing a module script failed|error loading dynamically imported|failed to fetch|chunkloaderror|loading chunk|unable to preload|mime type/i.test(msg);
}

/** Reload once to pick up the new version. Returns true if a reload was started. */
export function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < GUARD_MS) return false; // already tried a moment ago → let the error show
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: still reload once */
  }
  window.location.reload();
  return true;
}

/** `lazy()` that reloads into the new version instead of showing a blank page. */
export function lazyPage(load) {
  return lazy(() =>
    load().catch((err) => {
      if (isStaleVersionError(err) && reloadForNewVersion()) return new Promise(() => {}); // page is reloading
      throw err;
    }),
  );
}

/** Vite also reports failed preloads of shared code; treat them the same way. */
export function watchForNewVersion() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });
}
