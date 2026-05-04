import { Routes, Route } from 'react-router-dom';
import UserLayout from './components/layout/UserLayout';
import OwnerLayout from './components/layout/OwnerLayout';
import OwnerRoute from './components/auth/OwnerRoute';
import HomePage from './pages/HomePage';
import CafeDetailPage from './pages/CafeDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BookmarksPage from './pages/BookmarksPage';
import ShortlistPage from './pages/ShortlistPage';
import FavoritesPage from './pages/FavoritesPage';
import OwnerRegisterPage from './pages/owner/OwnerRegisterPage';
import OwnerLoginPage from './pages/owner/OwnerLoginPage';
import DashboardPage from './pages/owner/DashboardPage';
import CafeManagementPage from './pages/owner/CafeManagementPage';
import PromotionPage from './pages/owner/PromotionPage';
import PaymentPage from './pages/owner/PaymentPage';
import PaymentSuccessPage from './pages/owner/PaymentSuccessPage';
import PaymentFailedPage from './pages/owner/PaymentFailedPage';
import WizardPage from './pages/WizardPage';
import DiscoverPage from './pages/DiscoverPage';
import TrendingPage from './pages/TrendingPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Onboarding wizard — standalone, no top navbar */}
        <Route path="/wizard" element={<WizardPage />} />

        {/* Owner portal — standalone auth pages */}
        <Route path="/owner/register" element={<OwnerRegisterPage />} />
        <Route path="/owner/login" element={<OwnerLoginPage />} />

        {/* Owner portal — authenticated pages with sidebar */}
        <Route
          path="/owner"
          element={
            <OwnerRoute>
              <OwnerLayout />
            </OwnerRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="cafe" element={<CafeManagementPage />} />
          <Route path="promotion" element={<PromotionPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="payment/success" element={<PaymentSuccessPage />} />
          <Route path="payment/failed" element={<PaymentFailedPage />} />
        </Route>

        {/* User-facing app with top navbar */}
        <Route element={<UserLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cafe/:id" element={<CafeDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/shortlist" element={<ShortlistPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/trending" element={<TrendingPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
