import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PhotoGallery } from '../../components/profile/PhotoGallery';
import PackagesSection from './Packages';
import { toast } from 'sonner';
import { ContactButtons, Stars } from '../../components/common/Listing';
import { LocationCard, MapAddress } from '../../components/common/LocationCard';
import { RichText } from '../../components/common/RichText';
import { Avatar, Badge, EmptyState, Icon, Img, PageLoader, Reveal, SampleTag, Spinner } from '../../components/ui';
import { errorMessage, get, post } from '../../lib/api';
import { formatINR, timeAgo } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';

function ReviewForm({ providerId, mine }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(mine?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(mine?.comment || '');
  const m = useMutation({
    mutationFn: () => post(`/services/provider/${providerId}/reviews`, { rating, comment: comment || undefined }),
    onSuccess: () => {
      toast.success('Thank you for your review!');
      qc.invalidateQueries({ queryKey: ['provider', providerId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="card p-5">
      <b className="text-sm">{mine ? 'Update your review' : 'Rate this service'}</b>
      <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.button key={i} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.15 }} onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} className="text-gold" aria-label={`${i} stars`}>
            <Icon name="star" size={26} filled={i <= (hover || rating)} strokeWidth={1.5} />
          </motion.button>
        ))}
      </div>
      <textarea className="field mt-3" placeholder="Share your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={800} />
      <button className="btn btn-primary btn-sm mt-3" disabled={!rating || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? <Spinner size={15} /> : 'Submit review'}
      </button>
    </div>
  );
}

export default function ProviderDetail() {
  const { id } = useParams();
  const authed = useAuth((s) => s.status === 'authed');
  const openAuth = useUI((s) => s.openAuth);
  const { data: p, isLoading, isError } = useQuery({ queryKey: ['provider', id], queryFn: () => get(`/services/provider/${id}`) });

  if (isLoading) return <PageLoader />;
  if (isError) return <EmptyState icon="tent" title="Service not found" action={<Link to="/services" className="btn btn-outline">Back to services</Link>} />;

  return (
    <div className="bg-[#fbf7f1] pb-14">
      <div className="container-page pt-4 sm:pt-6">
        <Link to={`/services/category/${p.category.slug}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary sm:text-sm">
          <Icon name="arrow-left" size={16} /> {p.category.name}
        </Link>
      </div>
      {/* Phones show: photos → details → About → Location → packages → reviews. Computers: a left column and a sticky details column. */}
      <div className="container-page mt-3 grid gap-3 sm:gap-5 lg:grid-cols-[1.3fr_1fr] lg:gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card min-w-0 overflow-hidden p-2 sm:p-2.5 lg:col-start-1 lg:row-start-1">
          <PhotoGallery photos={p.photos || []} alt={p.businessName} aspect="aspect-[16/10] sm:aspect-[16/10]" fit="object-center" fallbackIcon={p.category.icon} />
        </motion.div>

        <div className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:h-max">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-3.5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="no-scrollbar -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 sm:flex-wrap">
              <Badge tone="red" className="shrink-0 !py-0.5 !text-[10.5px]">{p.category.name}</Badge>
              {p.subcategories?.map((s) => (
                <Badge key={s.id} tone="gray" className="shrink-0 !py-0.5 !text-[10.5px]">
                  {s.name}
                </Badge>
              ))}
              {p.isFeatured && <Badge className="shrink-0 !py-0.5 !text-[10.5px]">Featured</Badge>}
              {p.status !== 'APPROVED' && <Badge tone="gray" className="shrink-0 !py-0.5 !text-[10.5px]">{p.status === 'PENDING' ? 'Awaiting approval' : 'Needs changes'}</Badge>}
            </div>
            <h1 className="mt-2 font-serif text-[22px] leading-tight font-semibold sm:mt-3 sm:text-3xl">
              {p.businessName} {p.isSample && <SampleTag className="align-middle" />}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span className="flex items-center gap-1.5">
                <Stars value={p.ratingAvg} size={14} />
                <b>{p.ratingAvg ? p.ratingAvg.toFixed(1) : 'New'}</b>
                <span className="text-muted">· {p.ratingCount} reviews</span>
              </span>
              {p.priceFrom != null && (
                <span className="ml-auto rounded-full bg-[#fff2cd] px-3 py-1 text-[12px] text-[#7c5f35]">
                  From <b className="font-serif text-[16px] text-ink">{formatINR(p.priceFrom)}</b>
                </span>
              )}
            </div>
            <MapAddress address={p.location} mapUrl={p.mapUrl} className="mt-2.5" />
            {authed || p.isSample ? (
              <ContactButtons sample={p.isSample} phone={p.phone} whatsapp={p.whatsapp} name={p.businessName} className="mt-3" chat={{ type: 'SERVICE', id: p.id, ownerId: p.userId }} />
            ) : (
              <button className="btn btn-primary mt-3 w-full" onClick={() => openAuth()}>
                <Icon name="lock" size={16} /> Log in to see contact
              </button>
            )}
            {(p.canEdit || p.isOwner) && (
              <Link to={`/services/edit/${p.id}`} className="btn btn-outline btn-sm mt-2.5 w-full">
                <Icon name="edit" size={15} /> Edit listing
              </Link>
            )}
          </motion.div>
          {p.packages?.length > 0 && (
            <div className="card p-4">
              <b className="text-sm">Part of combo packages</b>
              {p.packages.map((pk) => (
                <Link key={pk.id} to="/services/combos" className="mt-2.5 flex items-center justify-between rounded-xl bg-sand px-3 py-2.5 text-sm hover:bg-primary-soft">
                  <span>{pk.title}</span>
                  <b>{formatINR(pk.price)}</b>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3 sm:space-y-5 lg:col-start-1 lg:row-start-2">
          <Reveal className="card p-4 sm:p-6">
            <h2 className="flex items-center gap-2.5 font-serif text-[17px] font-semibold sm:text-lg">
              <span className="section-icon">
                <Icon name="info" size={16} />
              </span>
              About
            </h2>
            <RichText className="mt-3" text={p.description} empty={<p className="mt-3 text-sm text-muted">No description yet.</p>} />
          </Reveal>
          <LocationCard address={p.location} mapUrl={p.mapUrl} />
        </div>

        <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-start-1 lg:row-start-3">
          <PackagesSection provider={p} authed={authed} onLogin={() => openAuth()} />
          <Reveal className="space-y-4">
            <h2 className="flex items-center gap-3 font-serif text-xl font-semibold">
              Reviews <span className="text-sm font-normal text-muted">({p.ratingCount})</span>
            </h2>
            {authed && !p.isOwner && <ReviewForm providerId={p.id} mine={p.myReview} />}
            {!authed && (
              <button className="btn btn-outline btn-sm" onClick={() => openAuth()}>
                Log in to write a review
              </button>
            )}
            {p.reviews.length === 0 ? (
              <p className="text-sm text-muted">No written reviews yet.</p>
            ) : (
              p.reviews.map((r) => (
                <div key={r.id} className="card flex gap-3 p-4">
                  <Avatar src={r.user.photoUrl} name={r.user.fullName} size={38} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-sm">{r.user.fullName}</b>
                      <Stars value={r.rating} size={12} />
                      <small className="text-xs text-muted">{timeAgo(r.createdAt)}</small>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-[#4b4641]">{r.comment}</p>}
                  </div>
                </div>
              ))
            )}
          </Reveal>
        </div>

      </div>
    </div>
  );
}
