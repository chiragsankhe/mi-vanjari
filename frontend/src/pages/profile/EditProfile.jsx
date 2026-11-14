import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PhotoManager } from '../../components/profile/PhotoManager';
import { BasicSection, cleanProfile, FamilySection, KundliSection, LifestyleSection, profileDefaults, profileFormSchema, ReachSection, STEP_FIELDS, WorkSection } from '../../components/profile/ProfileForm';
import { Icon, PageHeader, Spinner, Tabs } from '../../components/ui';
import { errorMessage, put } from '../../lib/api';
import { useAuth } from '../../store/auth';
import EditHub from './EditHub';

/** The pages of the profile form, in order. [id, tab name, short name used on the Next button] */
const ALL_STEPS = [
  ['basic', 'About you', 'About you'],
  ['photos', 'Photos', 'Photos'],
  ['work', 'Education & work', 'Education & work'],
  ['more', 'Lifestyle & about', 'Lifestyle & about'],
  ['family', 'Family', 'Family'],
  ['reach', 'Contact & privacy', 'Contact & privacy'],
  ['kundli', 'Kundli & partner', 'Kundli & partner'],
];

/** Fields checked before leaving a page. */
const PAGE_FIELDS = {
  basic: STEP_FIELDS.personal,
  work: STEP_FIELDS.work,
  more: STEP_FIELDS.more,
  family: STEP_FIELDS.family,
  reach: STEP_FIELDS.reach,
  kundli: STEP_FIELDS.kundli,
};

/** Matrimony-only pages: hidden for members who are not on Matrimony (unless a link asks for one directly). */
const MATRIMONY_ONLY = ['more', 'family', 'kundli'];

/**
 * /me/edit → the simple page (photo, name, city, contact + a card per section).
 * /me/edit?section=… → the step-by-step form used for the Matrimony profile.
 */
export default function EditProfile() {
  const [params] = useSearchParams();
  return params.get('section') ? <EditSteps /> : <EditHub />;
}

function EditSteps() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const form = useForm({ resolver: zodResolver(profileFormSchema), defaultValues: { ...profileDefaults(user.profile), phone: user.phone?.slice(-10) || '' }, mode: 'onTouched' });
  const { isDirty } = form.formState; // read here so react-hook-form keeps it up to date

  // "Join Matrimony" on the simple page lands here with the matrimony switch already on
  useEffect(() => {
    if (location.state?.join && !user.profile?.isMatrimonial) form.setValue('isMatrimonial', true, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requested = params.get('section') || 'basic';
  const isMatrimonial = !!form.watch('isMatrimonial');
  // members who are not on Matrimony only see: About you · Photos · Education & work · Contact & privacy
  const ORDER = isMatrimonial ? ALL_STEPS : ALL_STEPS.filter(([id]) => !MATRIMONY_ONLY.includes(id) || id === requested);
  const section = ORDER.some(([id]) => id === requested) ? requested : 'basic';
  const at = ORDER.findIndex(([id]) => id === section);
  const prev = ORDER[at - 1];
  const next = ORDER[at + 1];

  const go = (id) => {
    setParams({ section: id }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Check this page, save everything that changed, and say whether it worked. */
  const persist = async ({ quiet = false } = {}) => {
    const fields = PAGE_FIELDS[section];
    if (fields && !(await form.trigger(fields))) {
      toast.error('Please fix the highlighted fields');
      return false;
    }
    if (!isDirty) return true;
    setSaving(true);
    try {
      const updated = await put('/users/me', cleanProfile(form.getValues()));
      useAuth.getState().setUser(updated);
      qc.invalidateQueries({ queryKey: ['my-stats'] });
      form.reset({ ...profileDefaults(updated.profile), phone: updated.phone?.slice(-10) || '' });
      if (!quiet) toast.success('Saved');
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAndNext = async () => {
    if (await persist({ quiet: true })) go(next[0]);
  };
  const saveOnly = () => persist();
  const done = async () => {
    if (await persist({ quiet: true })) {
      toast.success('Profile saved');
      navigate('/me');
    }
  };

  return (
    <>
      <PageHeader eyebrow="Your profile" title="प्रोफाइल संपादित करा" subtitle="Keep your details up to date — complete profiles get more meaningful connections." icon="user" />
      <div className="container-page max-w-4xl py-8">
        <Link to="/me/edit" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
          <Icon name="arrow-left" size={15} /> Back to edit profile
        </Link>
        <Tabs id="edit" value={section} onChange={go} tabs={ORDER.map(([value, label]) => ({ value, label }))} />
        <p className="mt-3 text-xs text-muted">
          Step {at + 1} of {ORDER.length} · only the starred (*) answers are needed, everything else is optional.
        </p>
        <div className="card mt-3 p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {section === 'basic' && <BasicSection form={form} />}
              {section === 'photos' && <PhotoManager />}
              {section === 'work' && <WorkSection form={form} />}
              {section === 'more' && <LifestyleSection form={form} />}
              {section === 'family' && <FamilySection form={form} />}
              {section === 'reach' && <ReachSection form={form} phone={user.phone} phoneVerified={user.phoneVerified} />}
              {section === 'kundli' && <KundliSection form={form} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* navigation: every page moves on to the next one; the last page has Save changes + Done */}
        <div className="sticky bottom-[84px] z-10 mt-6 flex items-center justify-between gap-3 rounded-xl border border-line bg-white/90 p-3 backdrop-blur md:bottom-4">
          {prev ? (
            <button type="button" className="btn btn-ghost" onClick={() => go(prev[0])} disabled={saving}>
              <Icon name="arrow-left" size={17} /> <span className="hidden sm:inline">Back</span>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            section === 'photos' ? (
              // photos are saved as soon as they are added, so this just moves on
              <button type="button" className="btn btn-primary min-w-0 flex-1 !whitespace-normal !px-3 text-center leading-tight sm:flex-none sm:!px-5" onClick={() => go(next[0])}>
                Next: {next[2]} <Icon name="arrow" size={17} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary min-w-0 flex-1 !whitespace-normal !px-3 text-center leading-tight sm:flex-none sm:!px-5" onClick={saveAndNext} disabled={saving}>
                {saving ? (
                  <Spinner size={16} />
                ) : (
                  <>
                    Save & next: {next[2]} <Icon name="arrow" size={17} />
                  </>
                )}
              </button>
            )
          ) : (
            <div className="flex min-w-0 flex-1 justify-end gap-2">
              <button type="button" className="btn btn-outline min-w-0 !px-3 sm:!px-5" onClick={saveOnly} disabled={saving || !isDirty}>
                Save changes
              </button>
              <button type="button" className="btn btn-primary min-w-0 !px-3 sm:!px-5" onClick={done} disabled={saving}>
                {saving ? (
                  <Spinner size={16} />
                ) : (
                  <>
                    <Icon name="check" size={17} /> Done
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
