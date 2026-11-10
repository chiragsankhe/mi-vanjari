import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, post } from '../../lib/api';
import { cn, telLink, whatsappLink } from '../../lib/utils';
import { Icon, Reveal } from '../ui';
import { relationLabel, relationMr } from './ProfileForm';

/**
 * Family contacts shown on a profile: who to call about this match.
 * Numbers arrive already masked from the API unless the viewer is connected (familyContactsVisible).
 */
function CardHeader({ memberName, isSelf }) {
  return (
    <div className="flex items-center gap-3 border-b border-line bg-[linear-gradient(110deg,#fff7ee,#fdeee3)] px-5 py-4 sm:px-6">
      <span className="grid size-10 place-items-center rounded-full bg-primary text-white">
        <Icon name="users" size={18} />
      </span>
      <div className="min-w-0">
        <h2 className="font-serif text-lg font-semibold">
          Family contacts <span className="heading-deva text-sm font-normal text-muted">· कुटुंबीयांशी संपर्क</span>
        </h2>
        <p className="text-xs text-muted">{isSelf ? 'How your family appears to connected members.' : `Please speak to ${memberName ? `${memberName}’s` : 'the'} family first.`}</p>
      </div>
    </div>
  );
}

/** No numbers added yet: show who the family is (from the profile) and let the viewer ask for a contact. */
function NoFamilyContacts({ profile, memberName }) {
  const [requested, setRequested] = useState(Boolean(profile.familyContactRequested));
  const m = useMutation({
    mutationFn: () => post(`/matrimonial/${profile.userId}/request-family-contact`),
    onSuccess: (r) => {
      setRequested(true);
      toast.success(r.already ? 'You already asked this week' : `We’ve asked ${memberName || 'them'} to add a family contact`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const people = [
    profile.fatherName && { rel: 'Father', mr: 'वडील', name: profile.fatherName, sub: profile.fatherOccupation },
    profile.motherName && { rel: 'Mother', mr: 'आई', name: profile.motherName },
  ].filter(Boolean);
  return (
    <>
      {people.length > 0 && (
        <ul className="divide-y divide-line">
          {people.map((pp) => (
            <li key={pp.rel} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand font-serif text-lg font-semibold text-[#7d726a]">{pp.name[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <b className="text-sm">{pp.rel}</b> <span className="heading-deva text-xs text-muted">{pp.mr}</span>
                </p>
                <p className="truncate text-sm text-[#4b4641]">
                  {pp.name}
                  {pp.sub && <span className="text-muted"> · {pp.sub}</span>}
                </p>
              </div>
              <span className="rounded-full bg-sand px-2.5 py-1 text-[11px] text-muted">Number not added</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-3 border-t border-line bg-[#fffaf3] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <p className="flex-1 text-sm text-muted">
          {memberName || 'This member'} hasn’t added a family contact number yet. Tap below and we’ll ask them to add a father, mother or brother’s number so you can call the family.
        </p>
        <button className="btn btn-primary btn-sm shrink-0" disabled={requested || m.isPending} onClick={() => m.mutate()}>
          {requested ? (
            <>
              <Icon name="check" size={15} /> Requested
            </>
          ) : (
            <>
              <Icon name="phone" size={15} /> Request family contact
            </>
          )}
        </button>
      </div>
    </>
  );
}

export function FamilyContactsCard({ contacts = [], visible, memberName, isSelf, profile }) {
  if (!contacts.length && (isSelf || !profile)) return null;
  if (!contacts.length) {
    return (
      <Reveal className="card overflow-hidden">
        <CardHeader memberName={memberName} isSelf={false} />
        <NoFamilyContacts profile={profile} memberName={memberName} />
      </Reveal>
    );
  }
  const sorted = [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return (
    <Reveal className="card overflow-hidden">
      <CardHeader memberName={memberName} isSelf={isSelf} />
      <ul className="divide-y divide-line">
        {sorted.map((c, i) => (
          <li key={`${c.relation}-${i}`} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-full font-serif text-lg font-semibold', c.isPrimary ? 'bg-primary-soft text-primary' : 'bg-sand text-[#7d726a]')}>{c.name?.[0]?.toUpperCase() || '?'}</span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <b className="text-sm">{relationLabel(c)}</b>
                  {relationMr(c) && <span className="heading-deva text-xs text-muted">{relationMr(c)}</span>}
                  {c.isPrimary && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">★ Call first</span>}
                </p>
                <p className="truncate text-sm text-[#4b4641]">{c.name}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted">
                  <span className={cn('font-medium tabular-nums', visible ? 'text-ink' : 'tracking-wide')}>{c.phone}</span>
                  {c.bestTime && (
                    <span className="flex items-center gap-1">
                      <Icon name="calendar" size={11} /> {c.bestTime}
                    </span>
                  )}
                  {c.languages && (
                    <span className="flex items-center gap-1">
                      <Icon name="globe" size={11} /> {c.languages}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {visible && !isSelf ? (
              <div className="flex gap-2 sm:shrink-0">
                <a href={telLink(c.phone)} className="btn btn-outline btn-sm flex-1 sm:flex-none">
                  <Icon name="phone" size={15} /> Call
                </a>
                <a
                  href={whatsappLink(c.phone, `Namaskar ${c.name.split(' ')[0]}ji! I found ${memberName ? `${memberName}’s` : 'your family’s'} profile on Mi Vanjari and would like to talk.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-soft btn-sm flex-1 sm:flex-none"
                >
                  <Icon name="whatsapp" size={15} /> WhatsApp
                </a>
              </div>
            ) : (
              !visible && (
                <span className="flex items-center gap-1.5 self-start rounded-full bg-sand px-3 py-1.5 text-[11px] text-muted sm:self-center">
                  <Icon name="lock" size={12} /> Number once {memberName || 'they'} accept{memberName ? 's' : ''} you or follow{memberName ? 's' : ''} you back
                </span>
              )
            )}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
