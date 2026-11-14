import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChangePhotoButton } from '../../components/profile/ChangePhoto';
import { STATES } from '../../components/profile/formData';
import { SelectOther } from '../../components/profile/formBits';
import { cleanProfile, ContactFields, profileDefaults, profileFormSchema } from '../../components/profile/ProfileForm';
import { Avatar, Badge, Field, Icon, PageHeader, Spinner } from '../../components/ui';
import { errorMessage, get, put } from '../../lib/api';
import { useAuth } from '../../store/auth';

/** One part of Mi Vanjari the member has joined (or can join): what it is, and one clear button. */
function ModuleCard({ icon, title, tone = 'gray', status, children }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon name={icon} size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg font-semibold">{title}</h3>
            {status && <Badge tone={tone}>{status}</Badge>}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

const statusOf = (s) => (s === 'APPROVED' ? ['Live', 'green'] : s === 'PENDING' ? ['In review', 'gold'] : ['Needs changes', 'red']);

/** A listing the member owns, with Edit / View. */
function ListingRow({ name, status, editTo, viewTo }) {
  const [label, tone] = statusOf(status);
  return (
    <li className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1">
        <b className="block truncate text-sm">{name}</b>
        {status && status !== 'APPROVED' && <Badge tone={tone}>{label}</Badge>}
      </span>
      <Link to={viewTo} className="btn btn-ghost btn-sm">
        View
      </Link>
      <Link to={editTo} className="btn btn-outline btn-sm">
        <Icon name="edit" size={14} /> Edit
      </Link>
    </li>
  );
}

/**
 * Edit profile — the simple page everyone starts on: photo, name, city, a few words about you, contact.
 * Below it, a card for each part of the site the member is in, each with its own Edit button.
 * The long matrimony form (family, kundli, partner…) opens only from the Matrimony card.
 */
export default function EditHub() {
  const user = useAuth((s) => s.user);
  const p = user.profile;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const form = useForm({ resolver: zodResolver(profileFormSchema), defaultValues: { ...profileDefaults(p), phone: user.phone?.slice(-10) || '' }, mode: 'onTouched' });
  const { register, formState } = form;
  const e = formState.errors;

  const businesses = useQuery({ queryKey: ['business', 'mine'], queryFn: () => get('/business/mine') });
  const services = useQuery({ queryKey: ['my-services'], queryFn: () => get('/services/mine') });
  const achievements = useQuery({ queryKey: ['achievements', 'mine'], queryFn: () => get('/achievers/mine') });

  const save = async () => {
    if (!(await form.trigger(['fullName', 'currentCity', 'currentState', 'bio', 'email', 'phone']))) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      const updated = await put('/users/me', cleanProfile(form.getValues()));
      useAuth.getState().setUser(updated);
      qc.invalidateQueries({ queryKey: ['my-stats'] });
      form.reset({ ...profileDefaults(updated.profile), phone: updated.phone?.slice(-10) || '' });
      toast.success('Saved');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Your profile" title="प्रोफाइल संपादित करा" subtitle="Your photo and name are the same everywhere on Mi Vanjari." icon="user" />
      <div className="container-page max-w-3xl space-y-5 py-8">
        {/* ── The basics ── */}
        <section className="card p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar src={p.photoUrl} name={p.fullName} size={84} className="shrink-0 border-4 border-white shadow-[var(--shadow-card)]" />
            <div className="min-w-0">
              <b className="block truncate font-serif text-xl">{p.fullName}</b>
              <small className="mb-2 block text-xs text-muted">Tap below to choose a new profile photo.</small>
              <ChangePhotoButton />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" autoComplete="name" error={e.fullName?.message} {...register('fullName')} className="sm:col-span-2" />
            <Field label="City / village *" placeholder="e.g. Boisar" error={e.currentCity?.message} {...register('currentCity')} />
            <SelectOther form={form} name="currentState" label="State *" options={STATES} placeholder="Choose state" />
            <Field as="textarea" rows={3} label="About me (optional)" placeholder="A few lines about you…" maxLength={600} error={e.bio?.message} {...register('bio')} className="sm:col-span-2" />
            <ContactFields form={form} phone={user.phone} phoneVerified={user.phoneVerified} hideEmail={Boolean(user.email)} />
          </div>
          {user.email && <p className="mt-3 text-xs text-muted">Login email: {user.email}</p>}

          <div className="mt-5 flex items-center justify-between gap-3">
            <Link to="/me/edit?section=photos" className="text-[13px] font-semibold text-primary hover:underline">
              Manage all my photos
            </Link>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !formState.isDirty}>
              {saving ? <Spinner size={16} /> : <><Icon name="check" size={17} /> Save</>}
            </button>
          </div>
        </section>

        {/* ── Where you are on Mi Vanjari ── */}
        <h2 className="pt-2 font-serif text-xl font-semibold">Your sections</h2>

        <ModuleCard icon="heart" title="Matrimony" status={p.isMatrimonial ? 'You are listed' : null} tone="green">
          {p.isMatrimonial ? (
            <>
              <p className="mt-1 text-sm text-muted">Family, lifestyle, kundli and partner preferences.</p>
              <Link to="/me/edit?section=basic" className="btn btn-primary btn-sm mt-3">
                <Icon name="edit" size={15} /> Edit matrimony profile
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Not on Matrimony. Join if you or your family are looking for a life partner.</p>
              <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => navigate('/me/edit?section=basic', { state: { join: true } })}>
                <Icon name="plus" size={15} /> Join Matrimony
              </button>
            </>
          )}
        </ModuleCard>

        <ModuleCard icon="briefcase" title="My business">
          {businesses.isLoading ? (
            <p className="mt-2 text-sm text-muted">Loading…</p>
          ) : businesses.data?.length ? (
            <>
              <ul className="mt-1 divide-y divide-line">
                {businesses.data.map((b) => (
                  <ListingRow key={b.id} name={b.name} status={b.status} editTo={`/business/edit/${b.id}`} viewTo={`/business/${b.id}`} />
                ))}
              </ul>
              <Link to="/business/new" className="mt-2 inline-block text-[13px] font-semibold text-primary hover:underline">
                + List another business
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Showcase your business to the whole community.</p>
              <Link to="/business/new" className="btn btn-outline btn-sm mt-3">
                <Icon name="plus" size={15} /> List my business
              </Link>
            </>
          )}
        </ModuleCard>

        <ModuleCard icon="tent" title="My wedding services">
          {services.isLoading ? (
            <p className="mt-2 text-sm text-muted">Loading…</p>
          ) : services.data?.length ? (
            <>
              <ul className="mt-1 divide-y divide-line">
                {services.data.map((s) => (
                  <ListingRow key={s.id} name={s.businessName} status={s.status} editTo={`/services/edit/${s.id}`} viewTo={`/services/provider/${s.id}`} />
                ))}
              </ul>
              <Link to="/services/new" className="mt-2 inline-block text-[13px] font-semibold text-primary hover:underline">
                + List another service
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Offer hall, catering, photography or any wedding service.</p>
              <Link to="/services/new" className="btn btn-outline btn-sm mt-3">
                <Icon name="plus" size={15} /> List my service
              </Link>
            </>
          )}
        </ModuleCard>

        <ModuleCard icon="star" title="Achievers">
          <p className="mt-1 text-sm text-muted">
            {achievements.data?.length ? `You have ${achievements.data.length} nomination${achievements.data.length > 1 ? 's' : ''}.` : 'Share a proud moment of someone in the community.'}
          </p>
          <Link to="/achievers/new" className="btn btn-outline btn-sm mt-3">
            <Icon name="plus" size={15} /> Nominate an achiever
          </Link>
        </ModuleCard>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link to="/settings" className="btn btn-ghost btn-sm">
            <Icon name="settings" size={16} /> Privacy & settings
          </Link>
          <Link to="/me" className="btn btn-outline btn-sm">
            Back to my profile
          </Link>
        </div>
      </div>
    </>
  );
}
