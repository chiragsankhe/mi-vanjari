import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Paywall } from '../../components/membership/Paywall';
import { BusinessStep, emptyBusiness, emptyService, ServiceStep, toBusinessPayload, toServicePayload, validateBusiness, validateService } from '../../components/onboarding/ListingSteps';
import { PhotoManager } from '../../components/profile/PhotoManager';
import { BasicSection, cleanProfile, ContactSection, FamilySection, KundliSection, LifestyleSection, makeProfileSchema, profileDefaults, ReachSection, STEP_FIELDS, WorkSection } from '../../components/profile/ProfileForm';
import { BrandMark, Icon, Spinner } from '../../components/ui';
import { useScrollTop } from '../../hooks';
import { errorMessage, get, post, put } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';

/** What brings you here — each choice adds only the steps it needs. */
const GOALS = [
  ['COMMUNITY', 'users', 'Connect with community', 'समाजाशी जोडा'],
  ['MATRIMONY', 'heart', 'Find a life partner', 'जीवनसाथी शोधा'],
  ['BUSINESS', 'briefcase', 'Showcase my business', 'माझा व्यवसाय'],
  ['SERVICES', 'tent', 'List wedding services', 'लग्न सेवा'],
];

const STEP_INFO = {
  contact: ['user', 'Basic details', 'मूलभूत माहिती'],
  personal: ['user', 'About you', 'तुमच्याबद्दल'],
  work: ['graduation', 'Education & work', 'शिक्षण आणि काम'],
  more: ['sparkle', 'Lifestyle & about', 'आवडीनिवडी'],
  family: ['users', 'Family', 'कुटुंब'],
  reach: ['phone', 'Contact & privacy', 'संपर्क'],
  kundli: ['zodiac', 'Kundli & partner', 'कुंडली आणि अपेक्षा'],
  business: ['briefcase', 'Your business', 'व्यवसाय'],
  service: ['tent', 'Wedding service', 'लग्न सेवा'],
  pay: ['rupee', 'Membership', 'सदस्यत्व'],
  photos: ['camera', 'Photos', 'फोटो'],
};

// Profile-form fields validated on each step: see STEP_FIELDS in ProfileForm.jsx

export default function Onboarding() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  // Decided once on arrival: saving the profile updates the auth store, and that must not bounce us away mid-flow
  const [hadProfile] = useState(() => Boolean(user?.profile));
  const [payNeeded] = useState(() => Boolean(user?.membership?.required && !user?.membership?.hasAccess));
  const [goals, setGoals] = useState(() => {
    const chosen = (user?.intents || []).filter((g) => GOALS.some(([k]) => k === g));
    return chosen.length ? chosen : ['COMMUNITY'];
  });
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState({ profile: false, business: false, service: false });
  const [business, setBusiness] = useState(() => emptyBusiness({ phone: user?.phone }));
  const [service, setService] = useState(() => emptyService({ phone: user?.phone }));
  const [listingErrors, setListingErrors] = useState({});
  useScrollTop(idx);

  const form = useForm({
    resolver: zodResolver(makeProfileSchema()),
    defaultValues: { ...profileDefaults(), email: user?.email || '', phone: user?.phone?.slice(-10) || '', isMatrimonial: goals.includes('MATRIMONY') },
    mode: 'onTouched',
  });

  const M = goals.includes('MATRIMONY');
  const B = goals.includes('BUSINESS');
  const S = goals.includes('SERVICES');
  const steps = useMemo(
    () => [...(M ? ['personal', 'work', 'more', 'family', 'reach', 'kundli'] : ['contact']), ...(B ? ['business'] : []), ...(S ? ['service'] : []), ...(M ? [...(payNeeded ? ['pay'] : []), 'photos'] : [])],
    [M, B, S, payNeeded],
  );
  const lastFormIdx = steps.findLastIndex((s) => !['pay', 'photos'].includes(s));
  const current = steps[Math.min(idx, steps.length - 1)];
  const photoCount = user?.profile?.photos?.length || 0;

  if (hadProfile) return <Navigate to="/me" replace />;
  const finish = () => navigate('/me?welcome=1');

  const toggleGoal = (g) => {
    if (created.profile) return;
    setGoals((cur) => {
      const nextGoals = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
      const out = nextGoals.length ? nextGoals : ['COMMUNITY'];
      form.setValue('isMatrimonial', out.includes('MATRIMONY'));
      return out;
    });
    setIdx(0);
  };

  /** Validate the current step; returns true when it is fine. */
  const validateStep = async (name) => {
    if (STEP_FIELDS[name]) return form.trigger(STEP_FIELDS[name]);
    const errs = name === 'business' ? validateBusiness(business) : name === 'service' ? validateService(service) : {};
    setListingErrors(errs);
    if (Object.keys(errs).length) toast.error('Please fill the highlighted fields');
    return !Object.keys(errs).length;
  };

  /** Create the profile, then the business / service listings — each only once, so a retry never duplicates. */
  const submitAll = async () => {
    setSaving(true);
    const done = { ...created };
    try {
      if (!done.profile) {
        const ok = await form.trigger();
        if (!ok) {
          toast.error('Please check your details');
          setIdx(0);
          return;
        }
        await put('/users/me/intents', { intents: goals });
        await post('/users/me/profile', cleanProfile({ ...form.getValues(), isMatrimonial: M }));
        done.profile = true;
        setCreated({ ...done });
      }
      if (B && !done.business) {
        try {
          await post('/business', toBusinessPayload(business));
          done.business = true;
          setCreated({ ...done });
        } catch (err) {
          setIdx(steps.indexOf('business'));
          throw err;
        }
      }
      if (S && !done.service) {
        try {
          await post('/services', toServicePayload(service));
          done.service = true;
          setCreated({ ...done });
        } catch (err) {
          setIdx(steps.indexOf('service'));
          throw err;
        }
      }
      useAuth.getState().setUser(await get('/users/me'));
      const bits = ['Your profile is ready! आपलं स्वागत आहे 🙏', B && 'Your business is live in the directory.', S && 'Your wedding service was sent for approval.'].filter(Boolean);
      toast.success(bits.join(' '));
      if (M) setIdx(lastFormIdx + 1);
      else finish();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (!(await validateStep(current))) return;
    if (idx === 0) {
      // prefill the listing's area with the city from step 1 (still editable)
      const city = form.getValues('currentCity')?.trim();
      if (city) {
        setBusiness((b) => (b.location ? b : { ...b, location: city }));
        setService((s) => (s.location ? s : { ...s, location: city }));
      }
      // the mobile number from step 1 is the default listing contact
      const mobile = form.getValues('phone')?.replace(/\D/g, '').slice(-10);
      if (mobile?.length === 10) {
        setBusiness((b) => (b.phone ? b : { ...b, phone: mobile, whatsapp: b.whatsapp || mobile }));
        setService((s) => (s.phone ? s : { ...s, phone: mobile, whatsapp: s.whatsapp || mobile }));
      }
    }
    if (idx === lastFormIdx) return submitAll();
    setIdx((i) => i + 1);
  };

  const submitLabel = M ? (payNeeded ? 'Next: membership' : 'Next: add photos') : 'Create my profile';

  return (
    <div className="lattice relative min-h-[80vh] bg-[linear-gradient(125deg,#fff9f0,#f9eddd)] py-8 md:py-14">
      <div className="container-page relative max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <BrandMark size={48} />
          <div>
            <h1 className="heading-deva text-2xl font-semibold md:text-3xl">आपली प्रोफाइल तयार करा</h1>
            <p className="text-sm text-muted">{M ? 'A few short steps — only the starred (*) answers are needed. Everything else is optional.' : 'Just the basics — takes about a minute.'}</p>
          </div>
        </div>

        {/* What brings you here (multi-select) */}
        <div className="mb-5">
          <span className="field-label">I’m here to… (choose one or more)</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GOALS.map(([k, icon, en, mr]) => {
              const on = goals.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={created.profile}
                  onClick={() => toggleGoal(k)}
                  aria-pressed={on}
                  className={cn('flex items-center gap-2 rounded-xl border p-2.5 text-left transition disabled:cursor-not-allowed', on ? 'border-primary bg-primary-soft' : 'border-line bg-white/70 hover:border-primary/40')}
                >
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', on ? 'bg-primary text-white' : 'bg-sand text-muted')}>
                    <Icon name={on ? 'check' : icon} size={15} />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[12px] leading-tight sm:text-[13px]">{en}</b>
                    <small className="heading-deva text-[11px] text-muted">{mr}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <ol className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
          {steps.map((s, i) => {
            const [icon, en] = STEP_INFO[s];
            return (
              <li key={s} className={cn('flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-xs transition', i === idx ? 'border-primary bg-white font-bold shadow-[var(--shadow-card)]' : i < idx ? 'border-leaf/30 bg-leaf-soft' : 'border-line bg-white/50 text-muted')}>
                <span className={cn('grid size-6 place-items-center rounded-full', i < idx ? 'bg-leaf text-white' : i === idx ? 'bg-primary text-white' : 'bg-sand')}>
                  <Icon name={i < idx ? 'check' : icon} size={13} />
                </span>
                {en}
              </li>
            );
          })}
        </ol>

        <form onSubmit={(e) => e.preventDefault()} className="card overflow-hidden p-5 shadow-[var(--shadow-card)] sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              {current === 'contact' && (
                <>
                  <h2 className="mb-1 font-serif text-2xl font-semibold">Almost done</h2>
                  <p className="mb-5 text-sm text-muted">Just your name and where you live — that's all we need to begin.</p>
                  <ContactSection form={form} phone={user?.phone} phoneVerified={user?.phoneVerified} email={user?.email} />
                </>
              )}
              {current === 'personal' && (
                <>
                  <h2 className="mb-1 font-serif text-2xl font-semibold">About you</h2>
                  <p className="mb-5 text-sm text-muted">Your name, age and gender first, then a few basics and where you live.</p>
                  <BasicSection form={form} />
                </>
              )}
              {current === 'work' && <WorkSection form={form} />}
              {current === 'more' && <LifestyleSection form={form} />}
              {current === 'family' && <FamilySection form={form} />}
              {current === 'reach' && <ReachSection form={form} showMatrimonial={false} phone={user?.phone} phoneVerified={user?.phoneVerified} email={user?.email} />}
              {current === 'kundli' && <KundliSection form={form} />}
              {current === 'business' && (
                <BusinessStep
                  value={business}
                  onChange={(v) => {
                    setBusiness(v);
                    if (Object.keys(listingErrors).length) setListingErrors(validateBusiness(v));
                  }}
                  errors={listingErrors}
                />
              )}
              {current === 'service' && (
                <ServiceStep
                  value={service}
                  onChange={(v) => {
                    setService(v);
                    if (Object.keys(listingErrors).length) setListingErrors(validateService(v));
                  }}
                  errors={listingErrors}
                />
              )}
              {current === 'pay' && (
                <div>
                  <Paywall title="Activate matrimony" className="border-0 shadow-none" onPaid={() => setIdx(steps.indexOf('photos'))} />
                  <p className="mt-4 text-center text-xs text-muted">Your profile is ready either way. Until you become a member, you are not shown in matrimony search and can’t browse matches.</p>
                </div>
              )}
              {current === 'photos' && (
                <div>
                  <h2 className="font-serif text-2xl font-semibold">Add your photos</h2>
                  <p className="mt-1 mb-5 text-sm text-muted">
                    Profiles with photos get far more responses. Add as many as you like — any size, straight from your camera. If your account is private, other members only see a blurred version until you accept their request.
                  </p>
                  <PhotoManager intro={false} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
            {current === 'pay' ? (
              <button type="button" className="btn btn-ghost" onClick={() => setIdx(steps.indexOf('photos'))}>
                Pay later
              </button>
            ) : current === 'photos' ? (
              <button type="button" className="btn btn-ghost" onClick={finish}>
                Skip for now
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={idx === 0 || saving}
                onClick={() => {
                  setListingErrors({});
                  setIdx((i) => i - 1);
                }}
              >
                <Icon name="arrow-left" size={17} /> Back
              </button>
            )}
            {current === 'pay' ? (
              <span />
            ) : current === 'photos' ? (
              <button type="button" className="btn btn-primary" onClick={finish} disabled={!photoCount}>
                Finish <Icon name="check" size={17} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={next} disabled={saving}>
                {saving ? (
                  <Spinner size={18} />
                ) : idx === lastFormIdx ? (
                  <>
                    {submitLabel} <Icon name={M ? 'arrow' : 'check'} size={17} />
                  </>
                ) : (
                  <>
                    Continue <Icon name="arrow" size={17} />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Icon name="lock" size={13} /> Your phone number is never shown publicly.
        </p>
      </div>
    </div>
  );
}
