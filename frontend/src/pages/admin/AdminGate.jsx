import { motion } from 'motion/react';
import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Icon, PageLoader } from '../../components/ui';
import { get } from '../../lib/api';
import { useAuth } from '../../store/auth';

/**
 * Guard for /admin:
 *  • not signed in                         → /admin/login
 *  • signed in but not an admin/moderator  → warning screen (the attempt is logged on the server)
 *  • admin who used the normal member login → /admin/login (admin password required)
 */
export function AdminGate() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (status === 'loading') return <PageLoader />;
  if (status === 'guest') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  const staff = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  if (!staff) return <AccessDenied />;
  if (!user.adminSession) return <Navigate to="/admin/login" replace state={{ from: location.pathname, reauth: true }} />;
  return <Outlet />;
}

export function AccessDenied() {
  const user = useAuth((s) => s.user);
  // Touch the admin API once so the server records this attempt in the security log.
  useEffect(() => {
    get('/admin/ping').catch(() => {});
  }, []);
  return (
    <div className="grid min-h-[70vh] place-items-center bg-[repeating-linear-gradient(135deg,#fff7ee_0_22px,#fdeee3_22px_44px)] px-4 py-12">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-primary bg-white shadow-[0_30px_80px_rgba(158,46,15,0.2)]">
        <div className="flex items-center gap-3 bg-primary px-6 py-4 text-white">
          <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="grid size-11 place-items-center rounded-full bg-white/20 text-2xl">
            ⚠
          </motion.span>
          <div>
            <b className="block text-lg">Warning: restricted area</b>
            <span className="heading-deva text-sm text-white/85">प्रवेश निषिद्ध · फक्त प्रशासकांसाठी</span>
          </div>
        </div>
        <div className="space-y-3 p-6 text-sm leading-relaxed">
          <p>
            The admin panel is only for authorised Mi Vanjari administrators. <b>Your account{user?.profile?.fullName ? ` (${user.profile.fullName})` : ''} is not allowed here.</b>
          </p>
          <p className="rounded-lg bg-primary-soft px-3 py-2 text-[13px] text-primary">
            <Icon name="shield" size={14} className="mr-1 inline" /> This access attempt has been recorded with your account, time and IP address. Repeated attempts may lead to your account being suspended.
          </p>
          <p className="text-muted">If you are an administrator, sign in through the admin login.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/" className="btn btn-primary">
              <Icon name="home" size={16} /> Back to Mi Vanjari
            </Link>
            <Link to="/admin/login" className="btn btn-ghost">
              Admin login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
