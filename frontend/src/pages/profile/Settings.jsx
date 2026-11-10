import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logout } from '../../components/layout/Header';
import { MembershipCard } from '../../components/membership/MembershipCard';
import { Avatar, ConfirmDialog, Icon, PageHeader, Reveal, Toggle } from '../../components/ui';
import { del, errorMessage, get, post, put } from '../../lib/api';
import { disconnectSocket } from '../../lib/socket';
import { formatPhone } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';

function Row({ icon, title, desc, children }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand text-primary">
        <Icon name={icon} size={18} />
      </span>
      <div className="flex-1">
        <b className="block text-sm">{title}</b>
        <small className="text-xs text-muted">{desc}</small>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const lang = useUI((s) => s.lang);
  const setLang = useUI((s) => s.setLang);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const p = user.profile;

  const update = useMutation({
    mutationFn: (patch) => put('/users/me/settings', patch),
    onSuccess: (u) => {
      setUser(u);
      toast.success('Settings saved');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const blocked = useQuery({ queryKey: ['blocked'], queryFn: () => get('/follow/blocked') });
  const unblock = useMutation({
    mutationFn: (id) => del(`/follow/block/${id}`),
    onSuccess: () => {
      toast.success('Unblocked');
      qc.invalidateQueries({ queryKey: ['blocked'] });
    },
  });
  const logoutAll = useMutation({
    mutationFn: () => post('/auth/logout-all'),
    onSuccess: () => {
      disconnectSocket();
      useAuth.getState().clear();
      toast.success('Logged out from all devices');
      navigate('/');
    },
  });
  const deleteAccount = useMutation({
    mutationFn: () => del('/users/me'),
    onSuccess: () => {
      disconnectSocket();
      qc.clear();
      useAuth.getState().clear();
      toast.success('Your account has been deleted');
      navigate('/');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader eyebrow="Settings" title="सेटिंग्ज" subtitle="Control your privacy, visibility and account." icon="settings" />
      <div className="container-page max-w-3xl space-y-5 py-8">
        <MembershipCard />
        <Reveal className="card px-5 sm:px-6">
          <h2 className="pt-5 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Privacy</h2>
          <div className="divide-y divide-line">
            <Row icon="lock" title="Private profile" desc={p.accountType === 'PRIVATE' ? 'Only accepted followers can view your details and photos' : 'Your basic details are visible to community members'}>
              <Toggle label="Private profile" checked={p.accountType === 'PRIVATE'} disabled={update.isPending} onChange={(v) => update.mutate({ accountType: v ? 'PRIVATE' : 'PUBLIC' })} />
            </Row>
            <Row icon="phone" title="Show my phone number" desc="Reveal your number to accepted followers only">
              <Toggle label="Show phone" checked={p.showPhone} disabled={update.isPending} onChange={(v) => update.mutate({ showPhone: v })} />
            </Row>
            <Row icon="heart" title="Matrimonial listing" desc="Appear in matrimonial search results">
              <Toggle label="Matrimonial listing" checked={p.isMatrimonial} disabled={update.isPending} onChange={(v) => update.mutate({ isMatrimonial: v })} />
            </Row>
            <Row icon="eye" title="Profile active" desc="Turn off to temporarily hide your profile from everyone">
              <Toggle label="Profile active" checked={p.isActive} disabled={update.isPending} onChange={(v) => update.mutate({ isActive: v })} />
            </Row>
          </div>
        </Reveal>

        <Reveal className="card px-5 sm:px-6">
          <h2 className="pt-5 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Preferences</h2>
          <Row icon="globe" title="Language · भाषा" desc="Interface language">
            <select className="field w-auto" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="mr">मराठी</option>
              <option value="en">English</option>
            </select>
          </Row>
        </Reveal>

        <Reveal className="card px-5 py-5 sm:px-6">
          <h2 className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Blocked members</h2>
          {blocked.data?.length ? (
            <ul className="mt-3 divide-y divide-line">
              {blocked.data.map((b) => (
                <li key={b.userId} className="flex items-center gap-3 py-3">
                  <Avatar src={b.photoUrl} name={b.fullName || ''} size={36} />
                  <span className="flex-1 text-sm">{b.fullName}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => unblock.mutate(b.userId)}>
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">You haven’t blocked anyone.</p>
          )}
        </Reveal>

        <Reveal className="card px-5 sm:px-6">
          <h2 className="pt-5 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Account</h2>
          <div className="divide-y divide-line">
            {user.email && <Row icon="mail" title="Login email" desc={user.email} />}
            <Row icon="phone" title="Mobile number" desc={user.phone ? formatPhone(user.phone) : 'Not added — add it in Edit profile'} />
            <Row icon="logout" title="Log out" desc="Sign out of this device">
              <button className="btn btn-outline btn-sm" onClick={() => logout(navigate)}>
                Log out
              </button>
            </Row>
            <Row icon="shield" title="Log out everywhere" desc="Sign out of all devices">
              <button className="btn btn-outline btn-sm" onClick={() => logoutAll.mutate()} disabled={logoutAll.isPending}>
                Log out all
              </button>
            </Row>
            <Row icon="trash" title="Delete account" desc="Permanently delete your profile, messages and listings">
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </Row>
          </div>
        </Reveal>
      </div>
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => deleteAccount.mutate()} loading={deleteAccount.isPending} danger confirmLabel="Delete forever" title="Delete your account?">
        This permanently deletes your profile, photos, messages, follows, posts and listings. <b>This cannot be undone.</b>
      </ConfirmDialog>
    </>
  );
}
