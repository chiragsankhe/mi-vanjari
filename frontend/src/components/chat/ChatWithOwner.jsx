import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { errorMessage, post } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { Icon, Spinner } from '../ui';

/**
 * "Chat" with the owner of a business or wedding-service listing — no follow needed.
 * variant: 'button' (full button) | 'icon' (round icon, for cards inside links)
 */
export function ChatWithOwner({ type, id, ownerId, label = 'Chat', variant = 'button', className }) {
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  const openAuth = useUI((s) => s.openAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  if (user && ownerId && user.id === ownerId) return null; // your own listing

  const start = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (status !== 'authed') return openAuth(location.pathname + location.search);
    if (!user?.profile) {
      toast.info('Create your profile first — it takes a minute.');
      return navigate('/onboarding');
    }
    setBusy(true);
    try {
      const c = await post('/chat/open-listing', { type, id });
      navigate(`/messages/${c.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button type="button" onClick={start} disabled={busy} className={cn('grid size-9 shrink-0 place-items-center rounded-full border border-primary/30 bg-white text-primary transition hover:bg-primary hover:text-white', className)} aria-label={`${label} with owner`} title="Chat with owner">
        {busy ? <Spinner size={14} /> : <Icon name="chat" size={16} />}
      </button>
    );
  }
  return (
    <button type="button" onClick={start} disabled={busy} className={cn('btn btn-primary', className)}>
      {busy ? <Spinner size={16} /> : <Icon name="chat" size={17} />} {label}
    </button>
  );
}
