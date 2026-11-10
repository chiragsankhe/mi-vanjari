import { AnimatePresence, motion } from 'motion/react';
import { Component, lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthModal } from './components/auth/AuthModal';
import { ChatDock } from './components/chat/ChatDock';
import { Header } from './components/layout/Header';
import { Footer, MobileNav } from './components/layout/Shell';
import { EmptyState, PageLoader } from './components/ui';
import { useRealtime, useScrollTop } from './hooks';
import { refreshSession } from './lib/api';
import { AdminGate } from './pages/admin/AdminGate';
import { useAuth } from './store/auth';
import { useUI } from './store/ui';

// Lazy-loaded pages (code-split per route)
const Home = lazy(() => import('./pages/Home'));
const Onboarding = lazy(() => import('./pages/auth/Onboarding'));
const Browse = lazy(() => import('./pages/matrimonial/Browse'));
const ProfileDetail = lazy(() => import('./pages/matrimonial/ProfileDetail'));
const Requests = lazy(() => import('./pages/matrimonial/Requests'));
const Messages = lazy(() => import('./pages/chat/Messages'));
const Notifications = lazy(() => import('./pages/chat/Notifications'));
const Community = lazy(() => import('./pages/community/Community'));
const Services = lazy(() => import('./pages/services/Services'));
const CategoryList = lazy(() => import('./pages/services/CategoryList'));
const ProviderDetail = lazy(() => import('./pages/services/ProviderDetail'));
const Combos = lazy(() => import('./pages/services/Combos'));
const ServiceForm = lazy(() => import('./pages/services/ServiceForm'));
const BusinessDirectory = lazy(() => import('./pages/business/BusinessDirectory'));
const BusinessDetail = lazy(() => import('./pages/business/BusinessDetail'));
const BusinessForm = lazy(() => import('./pages/business/BusinessForm'));
const Achievers = lazy(() => import('./pages/achievers/Achievers'));
const AddAchiever = lazy(() => import('./pages/achievers/AddAchiever'));
const Astrology = lazy(() => import('./pages/astrology/Astrology'));
const MyProfile = lazy(() => import('./pages/profile/MyProfile'));
const EditProfile = lazy(() => import('./pages/profile/EditProfile'));
const Settings = lazy(() => import('./pages/profile/Settings'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const Admin = lazy(() => import('./pages/admin/Admin'));
const Info = lazy(() => import('./pages/misc/Info'));
const NotFound = lazy(() => import('./pages/misc/NotFound'));

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
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
        <EmptyState icon="lock" title="Please log in to continue" action={<button className="btn btn-primary" onClick={() => openAuth(location.pathname)}>Log in with mobile number</button>}>
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
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pb-safe flex-1"
        >
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </motion.main>
      </AnimatePresence>
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
