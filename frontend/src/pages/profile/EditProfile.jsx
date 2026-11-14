import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PhotoManager } from '../../components/profile/PhotoManager';
import { BasicSection, cleanProfile, ContactFields, FamilySection, KundliSection, LifestyleSection, profileDefaults, profileFormSchema, ReachSection, STEP_FIELDS, WorkSection } from '../../components/profile/ProfileForm';
import { Icon, PageHeader, Spinner, Tabs } from '../../components/ui';
import { errorMessage, put } from '../../lib/api';
import { useAuth } from '../../store/auth';

/** The pages of the profile form, in order. [id, tab name, short name used on the Next button] */
const ORDER = [
  ['basic', 'About you', 'About you'],
  ['work', 'Location & work', 'Location & work'],
  ['family', 'Family', 'Family'],
  ['more', 'Lifestyle & about', 'Lifestyle'],
  ['kundli', 'Kundli & partner', 'Kundli & partner'],
  ['photos', 'Photos', 'Photos'],
  ['reach', 'Contact & privacy', 'Contact & privacy'],
];

/** Fields checked before leaving a page. */
const PAGE_FIELDS = {
  basic: ['fullName', 'email', 'phone', ...STEP_FIELDS.personal, 'bio'],
  work: [...STEP_FIELDS.contact.filter((f) => f !== 'fullName' && f !== 'email' && f !== 'phone'), ...STEP_FIELDS.work],
  family: STEP_FIELDS.family,
  more: STEP_FIELDS.more,
  kundli: STEP_FIELDS.kundli,
  reach: STEP_FIELDS.reach,
};

export default function EditProfile() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const requested = params.get('section') || 'basic';
  const section = ORDER.some(([id]) => id === requested) ? requested : 'basic';
  const at = ORDER.findIndex(([id]) => id === section);
  const prev = ORDER[at - 1];
  const next = ORDER[at + 1];
  const [saving, setSaving] = useState(false);
  const form = useForm({ resolver: zodResolver(profileFormSchema), defaultValues: { ...profileDefaults(user.profile), phone: user.phone?.slice(-10) || '' }, mode: 'onTouched' });
  const { isDirty } = form.formState; // read here so react-hook-form keeps it up to date

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
        <Tabs id="edit" value={section} onChange={go} tabs={ORDER.map(([value, label]) => ({ value, label }))} />
        <p className="mt-3 text-xs text-muted">
          Step {at + 1} of {ORDER.length} · only the starred (*) answers are needed, everything else is optional.
        </p>
        <div className="card mt-3 p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {section === 'basic' && (
                <>
                  <div className="mb-5 grid gap-4 border-b border-line pb-5 sm:grid-cols-2">
                    <ContactFields form={form} phone={user.phone} phoneVerified={user.phoneVerified} requireEmail={false} />
                  </div>
                  <BasicSection form={form} />
                </>
              )}
              {section === 'work' && <WorkSection form={form} />}
              {section === 'family' && <FamilySection form={form} />}
              {section === 'more' && <LifestyleSection form={form} />}
              {section === 'kundli' && <KundliSection form={form} />}
              {section === 'photos' && <PhotoManager />}
              {section === 'reach' && <ReachSection form={form} />}
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
              <button type="button" className="btn btn-primary" onClick={() => go(next[0])}>
                Next: {next[2]} <Icon name="arrow" size={17} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={saveAndNext} disabled={saving}>
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
            <div className="flex gap-2">
              <button type="button" className="btn btn-outline" onClick={saveOnly} disabled={saving || !isDirty}>
                Save changes
              </button>
              <button type="button" className="btn btn-primary" onClick={done} disabled={saving}>
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
