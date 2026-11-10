import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, post, put } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { BrandMark, Icon, Modal, Spinner } from '../ui';

const INTENTS = [
  ['MATRIMONY', 'heart', 'Looking for a life partner', 'जीवनसाथी शोधत आहे'],
  ['COMMUNITY', 'users', 'Connect with community', 'समाजाशी जोडले जा'],
  ['BUSINESS', 'briefcase', 'Showcase my business', 'माझा व्यवसाय दाखवा'],
  ['SERVICES', 'tent', 'List my wedding services', 'माझ्या लग्न सेवा नोंदवा'],
];

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

export function AuthModal() {
  const open = useUI((s) => s.authOpen);
  const redirect = useUI((s) => s.authRedirect);
  const close = useUI((s) => s.closeAuth);
  const lang = useUI((s) => s.lang);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  // Development only: a 10-digit mobile number still works, so the seeded demo accounts can log in.
  const devPhone = import.meta.env.DEV && /^[6-9][0-9]{9}$/.test(email.trim()) ? email.trim() : null;
  const emailOk = Boolean(devPhone) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const who = () => (devPhone ? { phone: devPhone } : { email: email.trim().toLowerCase() });
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [intents, setIntents] = useState(['MATRIMONY']);

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

  const verify = async (code = otp) => {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await post('/auth/verify-otp', { ...who(), otp: code });
      useAuth.getState().setSession(res.accessToken, res.user);
      if (res.isNewUser || !res.user.intents?.length) {
        setStep(3);
      } else {
        toast.success(`नमस्कार, ${res.user.profile?.fullName?.split(' ')[0] || ''}! Welcome back.`);
        finish(res.user);
      }
    } catch (err) {
      setError(errorMessage(err));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const saveIntents = async () => {
    setLoading(true);
    try {
      const user = await put('/users/me/intents', { intents });
      useAuth.getState().setUser(user);
      finish(user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal open={open} onClose={close} label="Join Mi Vanjari">
      <div className="px-6 pt-7 pb-8 sm:px-8">
        <div className="mb-5 flex items-center gap-3">
          <BrandMark size={42} />
          <div>
            <b className="heading-deva block text-lg font-semibold">आपलं स्वागत आहे</b>
            <small className="text-xs text-muted">Welcome to Mi Vanjari</small>
          </div>
        </div>
        <div className="-mx-6 h-[3px] bg-[#eadfd5] sm:-mx-8">
          <motion.span className="block h-full bg-primary" animate={{ width: `${step * 33.34}%` }} transition={{ duration: 0.4 }} />
        </div>
        <p className="mt-4 mb-2 text-[10px] font-extrabold tracking-[0.14em] text-primary">STEP {step} OF 3</p>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" {...slide}>
              <h2 className="font-serif text-[28px] font-semibold">{lang === 'mr' ? 'समाजात सामील व्हा' : 'Join our community'}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Enter your email address. We’ll email you a 6-digit login code — no password needed.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (emailOk) sendOtp();
                }}
              >
                <label className="mt-6 flex h-[54px] items-center overflow-hidden rounded-lg border border-line bg-white transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
                  <span className="border-r border-line px-4 text-muted">
                    <Icon name="mail" size={18} />
                  </span>
                  <input
                    autoFocus
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
                </label>
                {error && <p className="field-error mt-2">{error}</p>}
                <button className="btn btn-primary mt-5 w-full" disabled={!emailOk || loading}>
                  {loading ? <Spinner size={18} /> : <>Send login code <Icon name="arrow" size={17} /></>}
                </button>
              </form>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#8d837a]">
                <Icon name="lock" size={13} /> Your email stays private and is never shown publicly.
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" {...slide}>
              <h2 className="font-serif text-[28px] font-semibold">Enter verification code</h2>
              <p className="mt-2 text-sm text-muted">
                We emailed a 6-digit code to <b className="break-all text-ink">{email.trim().toLowerCase()}</b>. Check your inbox (and Spam folder).{' '}
                <button className="font-semibold text-primary" onClick={() => setStep(1)}>
                  Change
                </button>
              </p>
              {devOtp && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 rounded-lg border border-dashed border-gold bg-gold-soft px-3 py-2 text-xs text-[#7c5f35]">
                  <b>Development mode:</b> your code is{' '}
                  <button className="font-mono text-sm font-bold tracking-widest text-primary-dark underline" onClick={() => { setOtp(devOtp); verify(devOtp); }}>
                    {devOtp}
                  </button>
                </motion.div>
              )}
              <OtpInput value={otp} onChange={setOtp} onComplete={verify} />
              {error && <p className="field-error -mt-3 mb-3">{error}</p>}
              <button className="btn btn-primary w-full" onClick={() => verify()} disabled={otp.length !== 6 || loading}>
                {loading ? <Spinner size={18} /> : <>Verify & continue <Icon name="arrow" size={17} /></>}
              </button>
              <button className="mt-4 w-full text-xs text-muted disabled:opacity-60" disabled={cooldown > 0 || loading} onClick={sendOtp}>
                {cooldown > 0 ? `Resend code in 00:${String(cooldown).padStart(2, '0')}` : <span className="font-semibold text-primary">Resend code</span>}
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" {...slide}>
              <h2 className="font-serif text-[28px] font-semibold">What brings you here?</h2>
              <p className="mt-2 text-sm text-muted">Choose all that apply — this personalises your experience.</p>
              <div className="my-5 grid gap-2">
                {INTENTS.map(([value, icon, en, mr], i) => {
                  const on = intents.includes(value);
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIntents((s) => (on ? s.filter((x) => x !== value) : [...s, value]))}
                      className={cn('flex items-center gap-3 rounded-lg border p-3.5 text-left transition', on ? 'border-primary bg-[#fff7f2] text-primary' : 'border-line bg-white text-[#5b534d] hover:border-primary/30')}
                    >
                      <Icon name={icon} />
                      <span className="flex-1">
                        <span className="block text-[13px] font-semibold">{en}</span>
                        <span className="heading-deva block text-xs opacity-75">{mr}</span>
                      </span>
                      <span className={cn('grid size-5 place-items-center rounded-full border-2', on ? 'border-primary bg-primary text-white' : 'border-line')}>{on && <Icon name="check" size={12} strokeWidth={3} />}</span>
                    </motion.button>
                  );
                })}
              </div>
              {error && <p className="field-error mb-3">{error}</p>}
              <button className="btn btn-primary w-full" disabled={!intents.length || loading} onClick={saveIntents}>
                {loading ? <Spinner size={18} /> : <>Create my profile <Icon name="arrow" size={17} /></>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
