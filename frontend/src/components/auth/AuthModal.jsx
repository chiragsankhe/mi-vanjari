import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, get, post } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { BrandMark, Icon, Modal, Spinner } from '../ui';

const PENDING_KEY = 'mv_login_pending';
const PENDING_MINUTES = 10; // same as the code's validity
function readPending() {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    if ((p?.email || p?.phone) && Date.now() - p.sentAt < PENDING_MINUTES * 60_000) return p;
  } catch {
    /* ignore */
  }
  return null;
}
function savePending(who, redirect) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ ...who, redirect: redirect || null, sentAt: Date.now() }));
  } catch {
    /* ignore */
  }
}
function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

const slide = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

export function OtpInput({ value, onChange, onComplete, length = 6 }) {
  const refs = useRef([]);
  const digits = value.padEnd(length, ' ').split('').slice(0, length);

  const setAt = (i, d) => {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).replace(/\s/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  return (
    <div className="my-6 flex gap-2 sm:gap-2.5" onPaste={(e) => {
      const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (text) {
        e.preventDefault();
        onChange(text);
        refs.current[Math.min(text.length, length - 1)]?.focus();
        if (text.length === length) onComplete?.(text);
      }
    }}>
      {digits.map((d, i) => (
        <motion.input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length /* not 1: SMS autofill delivers the whole code into one box */}
          value={d.trim()}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
          className={cn('h-14 w-full min-w-0 rounded-lg border bg-white text-center text-2xl font-semibold transition outline-none focus:border-primary focus:ring-4 focus:ring-primary/10', d.trim() ? 'border-primary/50' : 'border-line')}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '');
            if (!typed) return;
            // Overwriting the digit already in this box → keep just the new one
            if (typed.length === 1 || (typed.length === 2 && value[i])) {
              setAt(i, typed.slice(-1));
              refs.current[i + 1]?.focus();
              return;
            }
            // SMS autofill / fast typing drops several digits into one box → spread them across the boxes
            const merged = (value.slice(0, i) + typed).slice(0, length);
            onChange(merged);
            refs.current[Math.min(merged.length, length - 1)]?.focus();
            if (merged.length === length) onComplete?.(merged);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              if (value[i]) onChange(value.slice(0, i) + value.slice(i + 1));
              else if (i > 0) {
                onChange(value.slice(0, i - 1) + value.slice(i));
                refs.current[i - 1]?.focus();
              }
            }
            if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

/** Loads Google's sign-in script once. */
let gsiPromise;
function loadGoogle() {
  gsiPromise ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const el = document.createElement('script');
    el.src = 'https://accounts.google.com/gsi/client';
    el.async = true;
    el.onload = () => resolve(window.google);
    el.onerror = () => {
      gsiPromise = null;
      reject(new Error('Google failed to load'));
    };
    document.head.appendChild(el);
  });
  return gsiPromise;
}

/** The official "Continue with Google" button. Renders nothing if Google is not set up or blocked. */
function GoogleButton({ clientId, mode, onCredential }) {
  const box = useRef(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled || !box.current) return;
        google.accounts.id.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential), ux_mode: 'popup', auto_select: false });
        const width = Math.min(400, Math.max(200, Math.round(box.current.getBoundingClientRect().width)));
        box.current.innerHTML = '';
        google.accounts.id.renderButton(box.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: mode === 'signup' ? 'signup_with' : 'continue_with', logo_alignment: 'left', width });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, mode]);
  if (failed) return null;
  return <div ref={box} className="flex min-h-[44px] justify-center" />;
}

export function AuthModal() {
  const open = useUI((s) => s.authOpen);
  const redirect = useUI((s) => s.authRedirect);
  const startMode = useUI((s) => s.authMode);
  const close = useUI((s) => s.closeAuth);
  const lang = useUI((s) => s.lang);
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' — same passwordless flow, different words
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [step, setStep] = useState(1); // 1 = who are you · 2 = enter the code
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cfg, setCfg] = useState({ google: null, sms: false, email: true });
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const phoneOk = /^[6-9][0-9]{9}$/.test(phone);
  const inputOk = method === 'phone' ? phoneOk : emailOk;
  const who = () => (method === 'phone' ? { phone } : { email: email.trim().toLowerCase() });
  const shownTo = method === 'phone' ? `+91 ${phone}` : email.trim().toLowerCase();

  useEffect(() => {
    if (open) setMode(startMode === 'signup' ? 'signup' : 'login');
  }, [open, startMode]);

  // which sign-in methods the site has switched on
  useEffect(() => {
    if (!open) return;
    get('/auth/config')
      .then((c) => setCfg(c))
      .catch(() => {});
  }, [open]);
  useEffect(() => {
    if (!cfg.email && cfg.sms) setMethod('phone');
  }, [cfg]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(1);
        setOtp('');
        setError('');
        setDevOtp(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Came back after the page reloaded (e.g. while reading the code in the email app)? Continue at the code step.
  const status = useAuth((s) => s.status);
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || status === 'loading') return;
    restored.current = true;
    const pending = readPending();
    if (!pending) return;
    if (status === 'authed') return clearPending();
    if (pending.phone) {
      setMethod('phone');
      setPhone(pending.phone);
    } else {
      setMethod('email');
      setEmail(pending.email);
    }
    setStep(2);
    setOtp('');
    setCooldown(Math.max(0, 30 - Math.floor((Date.now() - pending.sentAt) / 1000)));
    useUI.getState().openAuth(pending.redirect);
  }, [status]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await post('/auth/send-otp', who());
      savePending(who(), redirect);
      setDevOtp(res.devOtp || null);
      setStep(2);
      setCooldown(30);
      setOtp('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const finish = (user) => {
    close();
    if (!user.profile) navigate('/onboarding');
    else if (redirect) navigate(redirect);
  };

  /** Common ending for a successful email-code / SMS-code / Google sign-in. */
  const signedIn = (res) => {
    clearPending();
    useAuth.getState().setSession(res.accessToken, res.user);
    if (res.isNewUser || !res.user.profile) {
      toast.success('आपलं स्वागत आहे! Just a few details to finish your account.');
    } else {
      toast.success(`नमस्कार, ${res.user.profile?.fullName?.split(' ')[0] || ''}! Welcome back.`);
    }
    finish(res.user);
  };

  const verify = async (code = otp) => {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError('');
    try {
      signedIn(await post('/auth/verify-otp', { ...who(), otp: code }));
    } catch (err) {
      setError(errorMessage(err));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async (credential) => {
    setLoading(true);
    setError('');
    try {
      signedIn(await post('/auth/google', { credential }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const signup = mode === 'signup';
  const canSwitchMethod = cfg.sms && cfg.email;
  const modeTab = (id, label) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => {
        setMode(id);
        setError('');
      }}
      className={cn('flex-1 rounded-md py-2.5 text-sm font-semibold transition', mode === id ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-ink')}
    >
      {label}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={() => {
        clearPending();
        close();
      }}
      label="Log in or create account"
    >
      <div className="px-5 pt-6 pb-7 sm:px-8 sm:pt-7 sm:pb-8">
        <div className="mb-5 flex items-center gap-3">
          <BrandMark size={42} />
          <div>
            <b className="heading-deva block text-lg font-semibold">आपलं स्वागत आहे</b>
            <small className="text-xs text-muted">Welcome to Mi Vanjari</small>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" {...slide}>
              <div role="tablist" aria-label="Log in or create account" className="mb-5 flex gap-1 rounded-lg bg-sand p-1">
                {modeTab('login', lang === 'mr' ? 'लॉग इन' : 'Log in')}
                {modeTab('signup', lang === 'mr' ? 'नवीन खाते' : 'Create account')}
              </div>

              <h2 className="font-serif text-[26px] leading-tight font-semibold">{signup ? (lang === 'mr' ? 'मोफत खाते तयार करा' : 'Create your free account') : lang === 'mr' ? 'पुन्हा स्वागत!' : 'Welcome back'}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{signup ? 'It takes less than a minute. No password to remember.' : 'Log in with a one-time code. No password needed.'}</p>

              {cfg.google && (
                <>
                  <div className="mt-5">
                    <GoogleButton clientId={cfg.google} mode={mode} onCredential={googleSignIn} />
                  </div>
                  <div className="my-4 flex items-center gap-3 text-[11px] font-semibold tracking-wide text-[#a0958b]">
                    <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
                  </div>
                </>
              )}

              {canSwitchMethod && (
                <div role="tablist" aria-label="Sign in with" className={cn('flex gap-2', cfg.google ? '' : 'mt-5')}>
                  {[
                    ['email', 'mail', 'Email'],
                    ['phone', 'phone', 'Mobile number'],
                  ].map(([k, icon, label]) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={method === k}
                      onClick={() => {
                        setMethod(k);
                        setError('');
                      }}
                      className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-[13px] font-semibold transition', method === k ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white text-muted hover:border-primary/40')}
                    >
                      <Icon name={icon} size={15} /> {label}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputOk && !loading) sendOtp();
                }}
              >
                <label className={cn('flex h-[54px] items-center overflow-hidden rounded-lg border border-line bg-white transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10', canSwitchMethod || cfg.google ? 'mt-3' : 'mt-5')}>
                  <span className="flex items-center gap-1.5 border-r border-line px-3.5 text-sm font-semibold text-muted">{method === 'phone' ? '+91' : <Icon name="mail" size={18} />}</span>
                  {method === 'phone' ? (
                    <input
                      key="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      aria-label="Mobile number"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="h-full min-w-0 flex-1 bg-transparent px-4 text-base outline-none"
                    />
                  ) : (
                    <input
                      key="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                      placeholder="you@gmail.com"
                      className="h-full min-w-0 flex-1 bg-transparent px-4 text-base outline-none"
                    />
                  )}
                </label>
                {error && <p className="field-error mt-2">{error}</p>}
                <button className="btn btn-primary mt-4 w-full" disabled={!inputOk || loading}>
                  {loading ? (
                    <Spinner size={18} />
                  ) : (
                    <>
                      {method === 'phone' ? 'Send OTP' : 'Send login code'} <Icon name="arrow" size={17} />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-muted">
                {signup ? 'Already a member?' : 'New to Mi Vanjari?'}{' '}
                <button type="button" className="font-semibold text-primary" onClick={() => setMode(signup ? 'login' : 'signup')}>
                  {signup ? 'Log in' : 'Create account'}
                </button>
              </p>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#8d837a]">
                <Icon name="lock" size={13} /> Your email and number stay private — never shown publicly.
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" {...slide}>
              <h2 className="font-serif text-[26px] font-semibold">Enter the 6-digit code</h2>
              <p className="mt-2 text-sm text-muted">
                {method === 'phone' ? 'We sent an SMS to ' : 'We emailed a code to '}
                <b className="break-all text-ink">{shownTo}</b>.{method === 'email' && ' Check your inbox (and Spam folder). You can switch to your email app — this page remembers you for 10 minutes.'}{' '}
                <button
                  className="font-semibold text-primary"
                  onClick={() => {
                    clearPending();
                    setStep(1);
                    setError('');
                  }}
                >
                  Change
                </button>
              </p>
              {devOtp && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 rounded-lg border border-dashed border-gold bg-gold-soft px-3 py-2 text-xs text-[#7c5f35]">
                  <b>Development mode:</b> your code is{' '}
                  <button
                    className="font-mono text-sm font-bold tracking-widest text-primary-dark underline"
                    onClick={() => {
                      setOtp(devOtp);
                      verify(devOtp);
                    }}
                  >
                    {devOtp}
                  </button>
                </motion.div>
              )}
              <OtpInput value={otp} onChange={setOtp} onComplete={verify} />
              {error && <p className="field-error -mt-3 mb-3">{error}</p>}
              <button className="btn btn-primary w-full" onClick={() => verify()} disabled={otp.length !== 6 || loading}>
                {loading ? (
                  <Spinner size={18} />
                ) : (
                  <>
                    {signup ? 'Verify & create account' : 'Verify & log in'} <Icon name="arrow" size={17} />
                  </>
                )}
              </button>
              <button className="mt-4 w-full text-xs text-muted disabled:opacity-60" disabled={cooldown > 0 || loading} onClick={sendOtp}>
                {cooldown > 0 ? `Resend code in 00:${String(cooldown).padStart(2, '0')}` : <span className="font-semibold text-primary">Resend code</span>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
