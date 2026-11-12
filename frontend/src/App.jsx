import { Component, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthModal } from './components/auth/AuthModal';
import { ChatDock } from './components/chat/ChatDock';
import { Header } from './components/layout/Header';
import { Footer, MobileNav } from './components/layout/Shell';
import { EmptyState, PageLoader } from './components/ui';
import { useRealtime, useScrollTop } from './hooks';
import { refreshSession } from './lib/api';
import { isStaleVersionError, lazyPage, reloadForNewVersion } from './lib/freshVersion';
import { AdminGate } from './pages/admin/AdminGate';
import { useAuth } from './store/auth';
import { useUI } from './store/ui';

// Lazy-loaded pages (code-split per route)
const Home = lazyPage(() => import('./pages/Home'));
const Onboarding = lazyPage(() => import('./pages/auth/Onboarding'));
const Browse = lazyPage(() => import('./pages/matrimonial/Browse'));
const ProfileDetail = lazyPage(() => import('./pages/matrimonial/ProfileDetail'));
const Requests = lazyPage(() => import('./pages/matrimonial/Requests'));
const Messages = lazyPage(() => import('./pages/chat/Messages'));
const Notifications = lazyPage(() => import('./pages/chat/Notifications'));
const Community = lazyPage(() => import('./pages/community/Community'));
const Services = lazyPage(() => import('./pages/services/Services'));
const CategoryList = lazyPage(() => import('./pages/services/CategoryList'));
const ProviderDetail = lazyPage(() => import('./pages/services/ProviderDetail'));
const Combos = lazyPage(() => import('./pages/services/Combos'));
const ServiceForm = lazyPage(() => import('./pages/services/ServiceForm'));
const BusinessDirectory = lazyPage(() => import('./pages/business/BusinessDirectory'));
const BusinessDetail = lazyPage(() => import('./pages/business/BusinessDetail'));
const BusinessForm = lazyPage(() => import('./pages/business/BusinessForm'));
const Achievers = lazyPage(() => import('./pages/achievers/Achievers'));
const AddAchiever = lazyPage(() => import('./pages/achievers/AddAchiever'));
const Astrology = lazyPage(() => import('./pages/astrology/Astrology'));
const MyProfile = lazyPage(() => import('./pages/profile/MyProfile'));
const EditProfile = lazyPage(() => import('./pages/profile/EditProfile'));
const Settings = lazyPage(() => import('./pages/profile/Settings'));
const AdminLogin = lazyPage(() => import('./pages/admin/AdminLogin'));
const Admin = lazyPage(() => import('./pages/admin/Admin'));
const Info = lazyPage(() => import('./pages/misc/Info'));
const NotFound = lazyPage(() => import('./pages/misc/NotFound'));

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    // a new version went live while this tab was open → reload into it instead of showing an error
    if (isStaleVersionError(error)) reloadForNewVersion();
  }
  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error)
      return (
        <EmptyState icon="info" title="Something went wrong on this page" action={<button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>}>
          {import.meta.env.DEV ? String(this.state.error?.message) : 'Please reload and try again. If it keeps happening, let us know.'}
        </EmptyState>
      );
    return this.props.children;
  }
}

/** Route guard: requires login (and a completed profile unless `allowNoProfile`). */
function RequireAuth({ allowNoProfile = false, roles }) {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const openAuth = useUI((s) => s.openAuth);
  const location = useLocation();

  useEffect(() => {
    if (status === 'guest') openAuth(location.pathname + location.search);
  }, [status, openAuth, location.pathname, location.search]);

  if (status === 'loading') return <PageLoader />;
  if (status === 'guest')
    return (
      <div className="container-page py-10">
        <EmptyState icon="lock" title="Please log in to continue" action={<button className="btn btn-primary" onClick={() => openAuth(location.pathname)}>Log in</button>}>
          This part of Mi Vanjari is only available to verified community members — it keeps everyone’s information safe.
        </EmptyState>
      </div>
    );
  if (!allowNoProfile && !user?.profile) return <Navigate to="/onboarding" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function Layout() {
  const location = useLocation();
  useRealtime();
  useScrollTop(location.pathname);
  const fullBleed = location.pathname.startsWith('/messages');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* Plain CSS fade-in (see .page-in): the page is visible by default, so a page can never get stuck invisible
          the way it could with a JS "wait for the old page to leave" animation while its code was still loading. */}
      <main key={location.pathname} className="page-in pb-safe flex-1">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      {!fullBleed && <Footer />}
      <MobileNav />
      <ChatDock />
      <AuthModal />
    </div>
  );
}

export default function App() {
  // Restore the session from the refresh cookie on first load
  useEffect(() => {
    refreshSession().catch(() => useAuth.getState().clear());
    document.documentElement.lang = useUI.getState().lang;
  }, []);

  return (
    <>
      <Routes>
        <Route
          path="admin/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminLogin />
            </Suspense>
          }
        />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="community" element={<Community />} />
          <Route path="services" element={<Services />} />
          <Route path="services/combos" element={<Combos />} />
          <Route path="services/category/:slug" element={<CategoryList />} />
          <Route path="services/provider/:id" element={<ProviderDetail />} />
          <Route path="business" element={<BusinessDirectory />} />
          <Route path="business/:id" element={<BusinessDetail />} />
          <Route path="achievers" element={<Achievers />} />
          <Route path="astrology" element={<Astrology />} />
          <Route path="info/:page" element={<Info />} />

          <Route element={<RequireAuth allowNoProfile />}>
            <Route path="onboarding" element={<Onboarding />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="matrimonial" element={<Browse />} />
            <Route path="profile/:userId" element={<ProfileDetail />} />
            <Route path="requests" element={<Requests />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:conversationId" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="me" element={<MyProfile />} />
            <Route path="me/edit" element={<EditProfile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="services/new" element={<ServiceForm />} />
            <Route path="services/edit/:id" element={<ServiceForm />} />
            <Route path="business/new" element={<BusinessForm />} />
            <Route path="business/edit/:id" element={<BusinessForm />} />
            <Route path="achievers/new" element={<AddAchiever />} />
          </Route>

          {/* Admin panel: own login (/admin/login), warning screen for everyone else */}
          <Route element={<AdminGate />}>
            <Route path="admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
    </>
  );
}
