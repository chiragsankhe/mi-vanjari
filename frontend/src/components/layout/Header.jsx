import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import { post } from '../../lib/api';
import { disconnectSocket } from '../../lib/socket';
import { queryClient } from '../../lib/queryClient';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { MADE_BY } from '../../lib/credits';
import { Avatar, BrandMark, Icon } from '../ui';

export const NAV_LINKS = [
  ['/', 'nav_home'],
  ['/community', 'nav_community'],
  ['/matrimonial', 'nav_matrimonial'],
  ['/services', 'nav_services'],
  ['/business', 'nav_business'],
  ['/achievers', 'nav_achievers'],
  ['/astrology', 'nav_astrology'],
];

export function Brand({ inverse = false }) {
  return (
    <Link to="/" className="flex min-w-0 shrink items-center gap-2.5 text-left sm:gap-3" aria-label="Mi Vanjari home">
      <BrandMark size={40} inverse={inverse} className="shrink-0" />
      <span className="min-w-0">
        <b className={cn('heading-deva block text-[17px] leading-tight font-bold md:text-lg', inverse && 'text-white')}>मी वंजारी</b>
        <small className={cn('block truncate text-[9px] tracking-[0.06em]', inverse ? 'text-[#bcaea3]' : 'text-muted')}>आपली माणसं, आपलं जग</small>
      </span>
    </Link>
  );
}

export async function logout(navigate) {
  try {
    await post('/auth/logout');
  } catch {
    /* ignore */
  }
  disconnectSocket();
  queryClient.clear();
  useAuth.getState().clear();
  navigate?.('/');
}

function UserMenu() {
  const user = useAuth((s) => s.user);
  const t = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const unread = user?.unread || {};
  const items = [
    ['/me', 'user', t('nav_profile')],
    ['/requests', 'users', t('nav_requests'), unread.requests],
    ['/messages', 'chat', t('nav_messages'), unread.messages],
    ['/notifications', 'bell', t('nav_alerts'), unread.notifications],
    ['/settings', 'settings', t('nav_settings')],
    ...(user?.role === 'ADMIN' || user?.role === 'MODERATOR' ? [['/admin', 'shield', t('nav_admin')]] : []),
  ];
  const total = (unread.notifications || 0) + (unread.messages || 0) + (unread.requests || 0);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative flex items-center gap-2 rounded-full border border-line bg-white py-1 pr-1 pl-1 transition hover:border-primary/40 sm:pr-3" aria-haspopup="menu" aria-expanded={open}>
        <Avatar src={user?.profile?.photoUrl} name={user?.profile?.fullName || 'Me'} size={32} />
        <span className="hidden max-w-[110px] truncate text-[13px] font-semibold lg:block">{user?.profile?.fullName?.split(' ')[0] || 'Account'}</span>
        <Icon name="chevron-down" size={14} className="hidden text-muted sm:block" />
        {total > 0 && <span className="absolute -top-1 -right-1 hidden min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-ivory md:grid">{total > 99 ? '99+' : total}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]"
            role="menu"
          >
            {items.map(([to, icon, label, count]) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#4b4641] hover:bg-sand" role="menuitem">
                <Icon name={icon} size={18} className="text-muted" />
                <span className="flex-1">{label}</span>
                {count > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{count}</span>}
              </Link>
            ))}
            <div className="my-1 h-px bg-line" />
            <button onClick={() => logout(navigate)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-primary hover:bg-primary-soft" role="menuitem">
              <Icon name="logout" size={18} /> {t('logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Alerts bell in the top bar on phones (the bottom bar has no room for it). Shows unread alerts + follow requests. */
function AlertsBell() {
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  const openAuth = useUI((s) => s.openAuth);
  const t = useT();
  const count = (user?.unread?.notifications || 0) + (user?.unread?.requests || 0);
  const className = 'relative grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-ink md:hidden';
  // visitors see the bell too — tapping it asks them to log in, then opens Alerts
  if (status !== 'authed') {
    return (
      <button type="button" onClick={() => openAuth('/notifications')} className={className} aria-label={t('nav_alerts')}>
        <Icon name="bell" size={18} />
      </button>
    );
  }
  return (
    <Link to="/notifications" className={className} aria-label={`${t('nav_alerts')}${count ? ` (${count} new)` : ''}`}>
      <Icon name="bell" size={18} />
      {count > 0 && <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-white ring-2 ring-white">{count > 9 ? '9+' : count}</span>}
    </Link>
  );
}

export function LangToggle({ className }) {
  const lang = useUI((s) => s.lang);
  const toggle = useUI((s) => s.toggleLang);
  return (
    <button onClick={toggle} className={cn('text-[13px] text-[#514a43] transition hover:text-primary', className)} aria-label="Switch language">
      <span className={cn(lang === 'mr' ? 'font-bold text-ink' : 'text-[#aaa]')}>मराठी</span>
      <span className="text-[#aaa]"> / </span>
      <span className={cn(lang === 'en' ? 'font-bold text-ink' : 'text-[#aaa]')}>EN</span>
    </button>
  );
}

export function Header() {
  const t = useT();
  const status = useAuth((s) => s.status);
  const openAuth = useUI((s) => s.openAuth);
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn('sticky top-0 z-40 border-b border-line bg-[rgba(253,246,236,0.92)] backdrop-blur-xl transition-shadow', scrolled && 'shadow-[0_6px_24px_rgba(60,35,18,0.06)]')}>
      <div className="container-page flex h-[66px] items-center gap-2 sm:gap-4 md:h-[78px]">
        <Brand />
        <nav className="mx-auto hidden h-full items-stretch gap-6 xl:flex" aria-label="Main">
          {NAV_LINKS.map(([to, key]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('relative flex items-center text-[13px] transition-colors', isActive ? 'font-bold text-primary' : 'text-[#514a43] hover:text-primary')}>
              {({ isActive }) => (
                <>
                  {t(key)}
                  {isActive && <motion.span layoutId="nav-underline" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 xl:ml-0">
          <LangToggle className="hidden sm:block" />
          {status !== 'loading' && <AlertsBell />}
          {status === 'authed' ? (
            <UserMenu />
          ) : status === 'guest' ? (
            <>
              <button className="btn btn-outline btn-sm hidden sm:inline-flex" onClick={() => openAuth()}>
                {t('login')}
              </button>
              <button className="btn btn-primary btn-sm !min-h-8 !gap-1 !px-3 !text-xs sm:!min-h-9 sm:!px-4 sm:!text-[13px]" onClick={() => openAuth(null, 'signup')}>
                <span className="sm:hidden">{t('join_short')}</span>
                <span className="hidden sm:inline">{t('join')}</span>
              </button>
            </>
          ) : (
            <span className="h-9 w-28" />
          )}
          <button className="grid size-9 place-items-center rounded-lg text-ink hover:bg-sand sm:size-10 xl:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
        </div>
      </div>

      {/* Rendered into <body>: the header's backdrop-filter would otherwise make `fixed` relative to the header bar */}
      {createPortal(
      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-[80] xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute top-0 right-0 flex h-full w-[min(320px,86vw)] flex-col overflow-y-auto border-l border-line bg-[#fdf6ec] p-5 shadow-[-12px_0_40px_rgba(40,20,10,0.25)]"
            >
              <div className="mb-6 flex items-center justify-between">
                <Brand />
                <button className="grid size-10 place-items-center rounded-lg hover:bg-sand" onClick={() => setDrawer(false)} aria-label="Close menu">
                  <Icon name="close" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map(([to, key], i) => (
                  <motion.div key={to} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                    <NavLink to={to} end={to === '/'} onClick={() => setDrawer(false)} className={({ isActive }) => cn('block rounded-lg px-4 py-3 text-[15px]', isActive ? 'bg-primary-soft font-bold text-primary' : 'text-ink hover:bg-sand')}>
                      {t(key)}
                    </NavLink>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-auto space-y-3 border-t border-line pt-5">
                <LangToggle />
                {status === 'guest' && (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => {
                      setDrawer(false);
                      openAuth(null, 'signup');
                    }}
                  >
                    {t('join')}
                  </button>
                )}
                <p className="text-center text-[11px] text-muted">{MADE_BY}</p>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </header>
  );
}
