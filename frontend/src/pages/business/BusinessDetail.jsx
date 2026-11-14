import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ContactButtons } from '../../components/common/Listing';
import { PhotoGallery } from '../../components/profile/PhotoGallery';
import { ReportDialogBody } from '../../components/profile/ProfileBits';
import { Avatar, ConfirmDialog, EmptyState, Icon, Modal, PageLoader, SampleTag, VerifiedDot } from '../../components/ui';
import { del, errorMessage, get } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';

export default function BusinessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authed = useAuth((s) => s.status === 'authed');
  const openAuth = useUI((s) => s.openAuth);
  const [confirm, setConfirm] = useState(false);
  const [report, setReport] = useState(false);
  const { data: b, isLoading, isError } = useQuery({ queryKey: ['business', id], queryFn: () => get(`/business/${id}`) });
  const remove = useMutation({
    mutationFn: () => del(`/business/${id}`),
    onSuccess: () => {
      toast.success('Business removed');
      navigate('/business');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <PageLoader />;
  if (isError) return <EmptyState icon="briefcase" title="Business not found" action={<Link to="/business" className="btn btn-outline">Back to directory</Link>} />;

  return (
    <div className="bg-[#fbf7f1] pb-14">
      <div className="container-page pt-6">
        <Link to="/business" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
          <Icon name="arrow-left" size={16} /> Business directory
        </Link>
      </div>
      <div className="container-page mt-4 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="card overflow-hidden p-2.5">
            <PhotoGallery photos={b.photos || []} alt={b.name} aspect="aspect-[16/9] sm:aspect-[16/10]" fit="object-center" fallbackIcon="briefcase" />
          </div>
          <div className="card p-6">
            <h2 className="font-serif text-lg font-semibold">About the business</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-[#4b4641]">{b.description || '—'}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 lg:sticky lg:top-24 lg:h-max">
          <div className="card p-6 shadow-[var(--shadow-card)]">
            <span className="bg-[#fff0d0] px-2 py-1 text-[10px] font-semibold text-[#8b6100]">{b.category}</span>
            <h1 className="mt-3 font-serif text-3xl font-semibold">
              {b.name} {b.isSample && <SampleTag className="align-middle" />}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <Icon name="map" size={15} /> {b.location}
            </p>
            {b.website && (
              <a href={b.website} target="_blank" rel="noreferrer noopener" className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Icon name="link" size={15} /> {b.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {b.owner && (
              <Link to={`/profile/${b.owner.userId}`} className="mt-5 flex items-center gap-3 rounded-lg bg-sand p-3 hover:bg-primary-soft">
                <Avatar src={b.owner.profilePhotoUrl} name={b.owner.fullName} size={40} />
                <span className="text-sm">
                  <small className="block text-[11px] text-muted">Owned by</small>
                  <b className="flex items-center gap-1">
                    {b.owner.fullName} {b.owner.isVerified && <VerifiedDot size={13} />}
                  </b>
                </span>
              </Link>
            )}
            {authed || b.isSample ? (
              <ContactButtons sample={b.isSample} phone={b.phone} contactName={b.contactName} extraContacts={b.extraContacts || []} whatsapp={b.whatsapp} name={b.name} className="mt-5" chat={{ type: 'BUSINESS', id: b.id, ownerId: b.owner?.userId || b.userId }} />
            ) : (
              <button className="btn btn-primary mt-5 w-full" onClick={() => openAuth()}>
                <Icon name="lock" size={16} /> Log in to see contact
              </button>
            )}
            {b.isOwner ? (
              <div className="mt-3 flex gap-2">
                <Link to={`/business/edit/${b.id}`} className="btn btn-outline flex-1">
                  <Icon name="edit" size={16} /> Edit
                </Link>
                <button className="btn btn-danger" onClick={() => setConfirm(true)} aria-label="Delete">
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ) : (
              authed && (
                <button className="mt-3 flex items-center gap-1.5 text-xs text-muted hover:text-primary" onClick={() => setReport(true)}>
                  <Icon name="flag" size={13} /> Report this listing
                </button>
              )
            )}
          </div>
        </motion.div>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => remove.mutate()} loading={remove.isPending} danger title="Delete this business?" confirmLabel="Delete">
        This removes the listing permanently. This cannot be undone.
      </ConfirmDialog>
      <Modal open={report} onClose={() => setReport(false)}>
        <ReportDialogBody targetType="BUSINESS" targetId={b.id} onDone={() => setReport(false)} />
      </Modal>
    </div>
  );
}
