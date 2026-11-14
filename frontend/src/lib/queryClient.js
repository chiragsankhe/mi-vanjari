import { QueryClient } from '@tanstack/react-query';
import { useAuth } from '../store/auth';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => {
        const s = err?.response?.status;
        if (s && s >= 400 && s < 500) return false;
        return count < 2;
      },
    },
  },
});

/**
 * Many answers depend on who is asking: a listing's phone number is hidden from visitors and shown to members.
 * When a page is opened fresh, its data is requested before the saved login has been restored, so it arrives in the
 * visitor's version (phone = null) and would stay that way. Whenever a member becomes logged in, every open page asks again.
 */
let lastMember = null;
useAuth.subscribe((s) => {
  const id = s.status === 'authed' ? s.user?.id || null : null;
  if (id === lastMember) return;
  lastMember = id;
  if (id) queryClient.invalidateQueries();
});
