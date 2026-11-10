import { motion } from 'motion/react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { Icon } from '../ui';
import { MADE_BY } from '../../lib/credits';
import { Brand, LangToggle } from './Header';

export function Footer() {
  const t = useT();
  return (
    <footer className="bg-night text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:py-14">
        <div>
          <Brand inverse />
          <p className="heading-deva mt-6 text-lg text-[#d8c8ba]">{t('footer_tagline')}</p>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-[#9d8f84]">
            Built for the community — connecting Vanjari families of Palghar across cities, states and countries.
          </p>
        </div>
        <FooterCol title="Explore" links={[['/matrimonial', t('nav_matrimonial')], ['/community', t('nav_community')], ['/achievers', t('nav_achievers')], ['/astrology', t('nav_astrology')]]} />
        <FooterCol title="Grow" links={[['/services', t('nav_services')], ['/services/combos', 'Combo packages'], ['/business', t('nav_business')], ['/business/new', 'List your business']]} />
        <FooterCol title="Trust" links={[['/info/privacy', t('privacy')], ['/info/safety', t('safety')], ['/info/contact', t('contact')]]}>
          <LangToggle className="mt-2 text-[#bcaea3] [&_span]:!text-inherit" />
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-[11px] text-[#8d7f74] md:flex-row">
          <span>© {new Date().getFullYear()} Mi Vanjari · मी वंजारी</span>
          <span>
            {MADE_BY} · <span className="text-[#b9a99c]">Palghar</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, children }) {
  return (
    <div>
      <h4 className="mb-4 text-[11px] font-bold tracking-[0.16em] text-gold uppercase">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-sm text-[#bcaea3] transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

/** Bottom navigation for phones (design `.mobile-nav`). */
export function MobileNav() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  const openAuth = useUI((s) => s.openAuth);
  const { pathname } = useLocation();
  if (pathname.startsWith('/messages/')) return null; // full-screen chat on mobile

  const unread = user?.unread || {};
  const items = [
    ['/', 'home', t('nav_home')],
    ['/matrimonial', 'heart', t('nav_matches')],
    ['/messages', 'chat', t('nav_messages'), unread.messages],
    ['/notifications', 'bell', t('nav_alerts'), (unread.notifications || 0) + (unread.requests || 0)],
    ['/me', 'user', t('nav_profile')],
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-[rgba(255,251,246,0.96)] px-1 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden" aria-label="Mobile">
      {items.map(([to, icon, label, count]) => {
        const needsAuth = to !== '/' && status !== 'authed';
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={(e) => {
              if (needsAuth) {
                e.preventDefault();
                openAuth(to);
              }
            }}
            className={({ isActive }) => cn('relative flex flex-col items-center gap-1 py-1 text-[10px] font-semibold', isActive ? 'text-primary' : 'text-[#8d8279]')}
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="mnav" className="absolute -top-1.5 h-0.5 w-8 rounded-full bg-primary" />}
                <span className="relative">
                  <Icon name={icon} size={22} />
                  {count > 0 && <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] text-white">{count > 9 ? '9+' : count}</span>}
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
