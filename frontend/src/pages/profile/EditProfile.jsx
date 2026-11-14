import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PhotoManager } from '../../components/profile/PhotoManager';
import { BasicSection, cleanProfile, ContactFields, FamilySection, KundliSection, LifestyleSection, profileDefaults, profileFormSchema, ReachSection, WorkSection } from '../../components/profile/ProfileForm';
import { Icon, PageHeader, Spinner, Tabs } from '../../components/ui';
import { errorMessage, put } from '../../lib/api';
import { useAuth } from '../../store/auth';

export default function EditProfile() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const section = params.get('section') || 'basic';
  const [saving, setSaving] = useState(false);
  const form = useForm({ resolver: zodResolver(profileFormSchema), defaultValues: { ...profileDefaults(user.profile), phone: user.phone?.slice(-10) || '' }, mode: 'onTouched' });

  const save = form.handleSubmit(
    async (values) => {
      setSaving(true);
      try {
        const updated = await put('/users/me', cleanProfile(values));
        useAuth.getState().setUser(updated);
        qc.invalidateQueries({ queryKey: ['my-stats'] });
        form.reset(profileDefaults(updated.profile));
        toast.success('Profile updated');
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setSaving(false);
      }
    },
    () => toast.error('Please fix the highlighted fields'),
  );

  return (
    <>
      <PageHeader eyebrow="Your profile" title="प्रोफाइल संपादित करा" subtitle="Keep your details up to date — complete profiles get more meaningful connections." icon="user" />
      <div className="container-page max-w-4xl py-8">
        <Tabs
          id="edit"
          value={section}
          onChange={(v) => setParams({ section: v }, { replace: true })}
          tabs={[
            { value: 'basic', label: 'About you' },
            { value: 'work', label: 'Location & work' },
            { value: 'family', label: 'Family' },
            { value: 'more', label: 'Lifestyle & about' },
            { value: 'kundli', label: 'Kundli & partner' },
            { value: 'reach', label: 'Contact & privacy' },
            { value: 'photos', label: 'Photos' },
          ]}
        />
        <div className="card mt-5 p-5 sm:p-8">
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
              {section === 'reach' && <ReachSection form={form} />}
              {section === 'photos' && <PhotoManager />}
            </motion.div>
          </AnimatePresence>
        </div>
        {section !== 'photos' && (
          <div className="sticky bottom-[84px] z-10 mt-6 flex justify-end gap-3 rounded-xl border border-line bg-white/90 p-3 backdrop-blur md:bottom-4">
            <button className="btn btn-ghost" onClick={() => navigate('/me')}>
              Done
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.formState.isDirty}>
              {saving ? <Spinner size={16} /> : <><Icon name="check" size={17} /> Save changes</>}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
