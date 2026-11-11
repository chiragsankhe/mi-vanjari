import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RashiLink } from '../../components/common/RashiReport';
import { Paywall } from '../../components/membership/Paywall';
import { FamilyContactsCard } from '../../components/profile/FamilyContactsCard';
import { PhotoGallery } from '../../components/profile/PhotoGallery';
import { KundaliResult } from '../../components/common/KundaliResult';
import { FollowButton, ReportDialogBody, ShortlistButton } from '../../components/profile/ProfileBits';
import { Badge, ConfirmDialog, EmptyState, ErrorState, Icon, Img, Modal, PageLoader, Reveal, Spinner, VerifiedDot } from '../../components/ui';
import { useScreenshotGuard } from '../../hooks';
import { errorCode, errorMessage, get, post, put } from '../../lib/api';
import { heightLabel, LABELS, lastActive, telLink, whatsappLink } from '../../lib/utils';
import { useAuth } from '../../store/auth';

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <Reveal className="card p-5 sm:p-6">
      <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold">
        <Icon name={icon} size={18} className="text-primary" /> {title}
      </h2>
      <dl className="divide-y divide-line/70">{children}</dl>
    </Reveal>
  );
}

function MoreMenu({ profile, onBlocked }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [block, setBlock] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const blockM = useMutation({
    mutationFn: () => post(`/follow/block/${profile.userId}`),
    onSuccess: () => {
      toast.success(`${profile.fullName} has been blocked`);
      onBlocked();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="relative" ref={ref}>
      <button className="grid size-11 place-items-center rounded-lg border border-line bg-white hover:bg-sand" onClick={() => setOpen((o) => !o)} aria-label="More options">
        <Icon name="more" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sand" onClick={() => { setOpen(false); setReport(true); }}>
              <Icon name="flag" size={16} /> Report profile
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary-soft" onClick={() => { setOpen(false); setBlock(true); }}>
              <Icon name="ban" size={16} /> Block
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <Modal open={report} onClose={() => setReport(false)}>
        <ReportDialogBody targetType="USER" targetId={profile.userId} onDone={() => setReport(false)} />
      </Modal>
      <ConfirmDialog open={block} onClose={() => setBlock(false)} onConfirm={() => blockM.mutate()} loading={blockM.isPending} danger confirmLabel="Block" title={`Block ${profile.fullName}?`}>
        They won’t be able to find your profile, follow you or message you. You can unblock them later from Settings.
      </ConfirmDialog>
    </div>
  );
}

function KundaliPanel({ userId }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['kundali', userId], queryFn: () => get(`/matrimonial/${userId}/kundali`), enabled: open, retry: false });
  return (
    <>
      <button className="btn btn-soft w-full" onClick={() => setOpen(true)}>
        <Icon name="zodiac" size={17} /> Check Kundali match
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="sm:w-[min(820px,100%)]" label="Kundali match">
        <div className="p-6 sm:p-8">
          <h2 className="heading-deva mb-5 pr-8 text-2xl font-semibold">कुंडली जुळणी · Guna Milan</h2>
          {q.isError ? (
            <EmptyState icon="zodiac" title="Can’t match yet" action={errorCode(q.error) === 'BIRTH_DETAILS_REQUIRED' && <Link to="/me/edit?section=family" className="btn btn-primary">Add my birth details</Link>}>
              {errorMessage(q.error)}
            </EmptyState>
          ) : !q.data ? (
            // also covers the first render after opening, before the request has started
            <div className="grid h-60 place-items-center text-primary">
              <Spinner size={28} />
            </div>
          ) : (
            <KundaliResult result={q.data} boyName={q.data.boyName} girlName={q.data.girlName} />
          )}
        </div>
      </Modal>
    </>
  );
}

export default function ProfileDetail() {
  const { userId } = useParams();
  const me = useAuth((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: p, isLoading, isError, error, refetch } = useQuery({ queryKey: ['profile', userId], queryFn: () => get(`/matrimonial/${userId}`), enabled: userId !== me?.id });
  useScreenshotGuard(Boolean(p) && userId !== me?.id);

  const openChat = useMutation({
    mutationFn: () => post(`/chat/open/${userId}`),
    onSuccess: (c) => navigate(`/messages/${c.id}`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const respond = useMutation({
    mutationFn: (action) => put(`/follow/${p.incomingRequest}/${action}`),
    onSuccess: (_r, action) => {
      toast.success(action === 'accept' ? 'Request accepted' : 'Request declined');
      qc.invalidateQueries({ queryKey: ['profile', userId] });
      qc.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  if (userId === me?.id) return <Navigate to="/me" replace />;
  if (isLoading) return <PageLoader />;
  if (isError) return <div className="container-page py-10">{error?.response?.status === 404 ? <EmptyState icon="user" title="Profile not available">This member may have hidden or deleted their profile.</EmptyState> : <ErrorState error={error} onRetry={refetch} />}</div>;

  const photos = p.locked ? [{ url: p.photoUrl }] : p.photos?.length ? p.photos : [{ url: p.photoUrl }];
  const watermark = `${me?.profile?.fullName || 'Mi Vanjari'} · ${me?.phone?.slice(-4) || ''}`;

  return (
    <div className="protected bg-[#fbf7f1] pb-10">
      <div className="h-36 bg-primary-dark bg-[repeating-linear-gradient(45deg,transparent_0_35px,rgba(227,181,93,0.18)_36px_37px)] md:h-44" />
      <div className="container-page -mt-24 grid gap-6 md:-mt-28 lg:grid-cols-[380px_1fr]">
        {/* Left: photos + actions */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:h-max">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden p-2.5 shadow-[var(--shadow-card)]">
            <PhotoGallery photos={photos} locked={p.locked} alt={p.fullName} watermark={watermark}>
              {p.locked && (
                <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-white backdrop-blur">
                  <Icon name="lock" size={15} className="shrink-0" />
                  <small className="text-[11px] leading-snug">
                    <b>Private profile</b>
                    {p.hiddenPhotoCount > 0 ? ` · ${p.hiddenPhotoCount} more ${p.hiddenPhotoCount === 1 ? 'photo' : 'photos'}` : ''} after {p.fullName?.split(' ')[0]} accepts your request
                  </small>
                </div>
              )}
              {p.matchScore != null && <span className="absolute top-5 left-3 z-10 rounded-full border border-[#e9c360] bg-[#fff5da] px-2.5 py-1 text-[11px] font-bold text-[#8c6100]">{p.matchScore}% match</span>}
              <span onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
                <ShortlistButton userId={p.userId} initial={p.shortlisted} className="absolute top-5 right-3 z-20" />
              </span>
            </PhotoGallery>
          </motion.div>

          {p.incomingRequest && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card border-gold/50 bg-[#fffaf0] p-4">
              <p className="text-sm">
                <b>{p.fullName}</b> wants to follow you.
              </p>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary btn-sm flex-1" onClick={() => respond.mutate('accept')} disabled={respond.isPending}>
                  Accept
                </button>
                <button className="btn btn-outline btn-sm flex-1" onClick={() => respond.mutate('decline')} disabled={respond.isPending}>
                  Decline
                </button>
              </div>
            </motion.div>
          )}

          <div className="flex gap-2">
            <FollowButton userId={p.userId} status={p.followStatus} accountType={p.accountType} className="flex-1" onChange={() => refetch()} />
            {p.canMessage && (
              <button className="btn btn-outline flex-1" onClick={() => openChat.mutate()} disabled={openChat.isPending}>
                <Icon name="chat" size={17} /> Message
              </button>
            )}
            <MoreMenu profile={p} onBlocked={() => navigate('/matrimonial')} />
          </div>
          {!p.locked && <KundaliPanel userId={p.userId} />}
        </div>

        {/* Right: details */}
        <div className="space-y-5 pt-2 md:pt-24 lg:pt-28">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-3xl font-semibold md:text-4xl">{p.fullName}</h1>
              {p.isVerified && <VerifiedDot size={22} />}
              {p.accountType === 'PRIVATE' && (
                <Badge tone="gray">
                  <Icon name="lock" size={11} /> Private
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              {[p.age ? `${p.age} years` : p.ageRange && `${p.ageRange} years`, `${p.currentCity}, ${p.currentState}`].filter(Boolean).join(' · ')}
              {p.nativeVillage && ` · Originally from ${p.nativeVillage}`}
            </p>
            {!p.locked && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-leaf">
                <span className="size-1.5 rounded-full bg-leaf" /> {lastActive(p.lastActiveAt)}
              </p>
            )}
            <div className="mt-4 flex gap-6 text-sm">
              <span>
                <b className="font-serif text-lg">{p.stats.followers}</b> <span className="text-muted">followers</span>
              </span>
              <span>
                <b className="font-serif text-lg">{p.stats.following}</b> <span className="text-muted">following</span>
              </span>
              {p.gunaScore != null && (
                <span>
                  <b className="font-serif text-lg">{p.gunaScore}/36</b> <span className="text-muted">gunas</span>
                </span>
              )}
            </div>
          </Reveal>

          {p.locked ? (
            <Reveal className="card overflow-hidden">
              <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">
                <div>
                  <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold">
                    <Icon name="user" size={18} className="text-primary" /> About
                  </h2>
                  <Row label="Age" value={p.age && `${p.age} years`} />
                  <Row label="Height" value={heightLabel(p.heightCm)} />
                  <Row label="Marital status" value={LABELS[p.maritalStatus]} />
                  <Row label="Lives in" value={[p.currentCity, p.currentState].filter(Boolean).join(', ')} />
                  <Row label="Native village" value={p.nativeVillage} />
                  <Row label="Gotra" value={p.gotra} />
                </div>
                <div>
                  <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold">
                    <Icon name="graduation" size={18} className="text-primary" /> Education & career
                  </h2>
                  <Row label="Education" value={p.degrees?.length ? p.degrees.map((d) => d.degree).join(', ') : p.education} />
                  <Row label="Occupation" value={p.occupation} />
                </div>
              </div>
              <div className="border-t border-line bg-[#fffaf3] p-5 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                  <Icon name="lock" size={14} className="text-primary" /> Private profile
                </p>
                <p className="mt-1 text-xs text-muted">
                  More photos, family details, contact numbers, partner preferences and Kundali are shown after {p.fullName?.split(' ')[0]} accepts your follow request.
                </p>
                {p.familyContactCount > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                    <Icon name="users" size={12} /> {p.familyContactCount} family {p.familyContactCount === 1 ? 'contact' : 'contacts'} available once they accept
                  </p>
                )}
              </div>
            </Reveal>
          ) : (
            <>
              {p.bio && (
                <Reveal className="card p-5 sm:p-6">
                  <h2 className="mb-2 font-serif text-lg font-semibold">In {p.fullName?.split(' ')[0] || 'their'}’s words</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-[#4b4641]">{p.bio}</p>
                </Reveal>
              )}
              <div className="grid gap-5 xl:grid-cols-2">
                <Section title="About" icon="user">
                  <Row label="Age" value={p.age && `${p.age} years`} />
                  <Row label="Height" value={heightLabel(p.heightCm)} />
                  <Row label="Marital status" value={LABELS[p.maritalStatus]} />
                  <Row label="Lives in" value={`${p.currentCity}, ${p.currentState}`} />
                  <Row label="Native village" value={p.nativeVillage} />
                  <Row label="Mobile" value={p.phone} />
                  {p.phoneVisible ? (
                    <div className="flex gap-2 pt-3">
                      <a href={telLink(p.phone)} className="btn btn-outline btn-sm flex-1">
                        <Icon name="phone" size={15} /> Call
                      </a>
                      <a href={whatsappLink(p.phone, 'Namaskar! I found your profile on Mi Vanjari.')} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm flex-1">
                        <Icon name="whatsapp" size={15} /> WhatsApp
                      </a>
                    </div>
                  ) : (
                    p.phone && <p className="pt-2 text-xs text-muted">{p.canMessage ? 'Mobile is shown once they accept you or follow you back — send a message meanwhile.' : 'Mobile is shown once they accept your follow request, if they allow it.'}</p>
                  )}
                </Section>
                <Section title="Education & career" icon="graduation">
                  {p.degrees?.length ? (
                    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm">
                      <dt className="text-muted">Education</dt>
                      <ul className="space-y-1.5">
                        {p.degrees.map((d, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <Icon name="graduation" size={15} className="mt-0.5 shrink-0 text-primary" />
                            <span>
                              <b className="font-semibold">{d.degree}</b>
                              {(d.institute || d.year) && <span className="text-muted"> · {[d.institute, d.year].filter(Boolean).join(' · ')}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <Row label="Education" value={p.education} />
                  )}
                  <Row label="Occupation" value={p.occupation} />
                  <Row label="Annual income" value={p.annualIncome} />
                  {p.workDetails && (
                    <div className="pt-2.5">
                      <span className="text-sm text-muted">More about work</span>
                      <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-[#4b4641]">{p.workDetails}</p>
                    </div>
                  )}
                </Section>
                <Section title="Family" icon="users">
                  <Row label="Gotra" value={p.gotra} />
                  <Row label="Sub-caste" value={p.subCaste} />
                  <Row label="Father" value={[p.fatherName, p.fatherOccupation].filter(Boolean).join(' · ')} />
                  <Row label="Mother" value={p.motherName} />
                  <Row label="Siblings" value={p.siblingsCount} />
                  <Row label="Family type" value={LABELS[p.familyType]} />
                </Section>
                <Section title="Astrology" icon="zodiac">
                  <Row label="Rashi" value={p.rashi && <RashiLink rashi={p.rashi} nakshatra={p.nakshatra} name={p.fullName?.split(" ")[0]} />} />
                  <Row label="Nakshatra" value={p.nakshatra} />
                  {!p.rashi && <p className="py-2 text-sm text-muted">Birth details not added.</p>}
                </Section>
                {p.isMatrimonial && (
                  <Section title="Partner preferences" icon="heart">
                    <Row label="Age" value={p.prefAgeMin && p.prefAgeMax && `${p.prefAgeMin} – ${p.prefAgeMax} years`} />
                    <Row label="Education" value={p.prefEducation} />
                    <Row label="Location" value={p.prefLocation} />
                  </Section>
                )}
              </div>
              {/* Family contacts — last section, so families know whom to call after reading the profile */}
              {p.matrimonyLocked ? (
                <Paywall compact title={p.familyContactCount ? `${p.familyContactCount} family ${p.familyContactCount === 1 ? 'contact' : 'contacts'} · matrimony details are for members` : undefined} />
              ) : (
                <FamilyContactsCard contacts={p.familyContacts} visible={p.familyContactsVisible} memberName={p.fullName?.split(' ')[0]} profile={p} />
              )}
            </>
          )}
          <p className="flex items-center gap-1.5 rounded-lg bg-[#f5e9d7] px-3 py-2 text-[11px] text-[#7c5f35]">
            <Icon name="shield" size={14} /> Screenshots and copying are disabled on profiles to protect our members.
          </p>
        </div>
      </div>
    </div>
  );
}
