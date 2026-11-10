import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { OtpInput } from '../../components/auth/AuthModal';
import { BrandMark, Icon, Spinner } from '../../components/ui';
import { errorCode, errorMessage, post } from '../../lib/api';
import { MADE_BY } from '../../lib/credits';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';

const strong = (pw) => pw.length >= 10 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
const looksLikeEmail = (e) => /^\S+@\S+\.\S+$/.test(e.trim());

/**
 * Admin sign-in — /admin/login
 *  1. Admin email → 6-digit code by email (only admin emails receive one; others are refused and logged)
 *  2. Code + admin password. On the very first admin login the admin creates that password here.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [devOtp, setDevOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async (e) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await post('/auth/admin/send-otp', { email: email.trim() });
      setHasPassword(r.hasPassword);
      setDevOtp(r.devOtp || '');
      setSentTo(r.sentTo || email.trim());
      setOtp('');
      setPassword('');
      setConfirm('');
      setStep('verify');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const login = async (e) => {
    e?.preventDefault();
    setError('');
    if (otp.length !== 6) return setError('Enter the 6-digit code from the email.');
    if (!hasPassword) {
      if (!strong(password)) return setError('Use at least 10 characters with letters and numbers.');
      if (password !== confirm) return setError('The two passwords do not match.');
    } else if (!password) return setError('Enter your admin password.');
    setBusy(true);
    try {
      const r = await post('/auth/admin/login', { email: email.trim(), otp, ...(hasPassword ? { password } : { newPassword: password }) });
      useAuth.getState().setSession(r.accessToken, r.user);
      toast.success(hasPassword ? 'Welcome back, admin' : 'Admin password created — keep it safe');
      const from = location.state?.from;
      navigate(from?.startsWith('/admin') && from !== '/admin/login' ? from : '/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      // the code is used up on every attempt — go back for a fresh one
      if (errorCode(err) === 'WRONG_ADMIN_PASSWORD' || /expired|attempts|request a new/i.test(errorMessage(err))) {
        setOtp('');
        setStep('email');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-night px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(200,65,26,0.35),transparent_45%),radial-gradient(circle_at_85%_90%,rgba(212,160,23,0.18),transparent_40%)]" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <BrandMark size={46} />
          <div>
            <b className="heading-deva block text-xl">मी वंजारी</b>
            <span className="text-xs tracking-[0.18em] text-[#f1bf76] uppercase">Admin console</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[#fffaf3] text-ink shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 border-b border-line bg-primary-soft px-6 py-3 text-xs font-semibold text-primary">
            <Icon name="shield" size={15} /> Authorised administrators only — every attempt is recorded
          </div>
          {location.state?.reauth && step === 'email' && (
            <p className="mx-6 mt-5 rounded-lg bg-[#fff5da] px-3 py-2 text-xs text-[#8c6100]">For security, the admin panel has its own login (email code + admin password), even if you are signed in to the website.</p>
          )}

          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <motion.form key="email" onSubmit={sendCode} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="p-6">
                <h1 className="font-serif text-2xl font-semibold">Admin sign in</h1>
                <p className="mt-1 text-sm text-muted">Enter the admin email. We’ll email you a 6-digit code.</p>
                <label className="mt-5 block">
                  <span className="field-label">Admin email</span>
                  <span className="field flex items-center gap-2 p-0 pl-3">
                    <Icon name="send" size={16} className="text-muted" />
                    <input
                      autoFocus
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={120}
                      className="h-full w-full bg-transparent py-3 pr-3 outline-none"
                    />
                  </span>
                </label>
                {error && <p className="mt-3 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary">{error}</p>}
                <button className="btn btn-primary mt-5 w-full" disabled={busy || !looksLikeEmail(email)}>
                  {busy ? <Spinner size={18} /> : <>Email me a code <Icon name="arrow" size={17} /></>}
                </button>
              </motion.form>
            ) : (
              <motion.form key="verify" onSubmit={login} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="p-6">
                <button type="button" onClick={() => setStep('email')} className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted hover:text-primary">
                  <Icon name="arrow-left" size={14} /> Change email
                </button>
                <h1 className="font-serif text-2xl font-semibold">{hasPassword ? 'Verify it’s you' : 'Create your admin password'}</h1>
                <p className="mt-1 text-sm text-muted">
                  Code sent to <b className="text-ink">{sentTo}</b> — check your inbox (and spam). It expires in 10 minutes.
                </p>
                {devOtp && (
                  <p className="mt-3 rounded-lg bg-gold-soft px-3 py-2 text-xs text-[#8c6100]">
                    Email isn’t set up yet (development) — your code is <b className="tracking-widest">{devOtp}</b>
                  </p>
                )}
                <OtpInput value={otp} onChange={setOtp} />
                <label className="block">
                  <span className="field-label">{hasPassword ? 'Admin password' : 'New admin password'}</span>
                  <span className="field flex items-center p-0">
                    <input
                      type={show ? 'text' : 'password'}
                      autoComplete={hasPassword ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-full w-full bg-transparent px-3 py-3 outline-none"
                      maxLength={128}
                    />
                    <button type="button" onClick={() => setShow((s) => !s)} className="px-3 text-muted hover:text-primary" aria-label={show ? 'Hide password' : 'Show password'}>
                      <Icon name="eye" size={17} />
                    </button>
                  </span>
                </label>
                {!hasPassword && (
                  <>
                    <ul className="mt-2 space-y-0.5 text-[11px]">
                      {[
                        [password.length >= 10, 'At least 10 characters'],
                        [/[A-Za-z]/.test(password) && /\d/.test(password), 'Letters and numbers'],
                      ].map(([ok, l]) => (
                        <li key={l} className={cn('flex items-center gap-1', ok ? 'text-leaf' : 'text-muted')}>
                          <Icon name={ok ? 'check' : 'minus'} size={12} /> {l}
                        </li>
                      ))}
                    </ul>
                    <label className="mt-3 block">
                      <span className="field-label">Confirm password</span>
                      <input type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field" maxLength={128} />
                    </label>
                    <p className="mt-2 text-[11px] text-muted">You’ll need this password and a fresh email code every time you open the admin panel.</p>
                  </>
                )}
                {error && <p className="mt-3 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary">{error}</p>}
                <button className="btn btn-primary mt-5 w-full" disabled={busy}>
                  {busy ? <Spinner size={18} /> : <>{hasPassword ? 'Sign in to admin' : 'Create password & sign in'} <Icon name="shield" size={17} /></>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
        <p className="mt-5 flex justify-between text-[11px] text-white/50">
          <Link to="/" className="hover:text-white">
            ← Back to website
          </Link>
          <span>{MADE_BY}</span>
        </p>
      </motion.div>
    </div>
  );
}
