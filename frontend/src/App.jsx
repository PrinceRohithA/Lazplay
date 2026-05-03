import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import StorefrontLayout from "./components/StorefrontLayout.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import {
  AdminDashboardPage,
  AuthPage,
  CartPage,
  CheckoutPage,
  CommunityPage,
  DeveloperDashboardPage,
  GameDetailsPage,
  HomePage,
  LibraryPage,
  NotificationsPage,
  ProfilePage,
  SettingsPage,
  StorePage
} from "./pages/PlatformPages.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StorefrontLayout />}> 
        <Route index element={<HomePage />} />
        <Route path="store" element={<StorePage />} />
        <Route path="game/:gameId" element={<GameDetailsPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="games" element={<Navigate to="/library" replace />} />
        <Route
          path="cart"
          element={(
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="checkout"
          element={(
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="library"
          element={(
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="profile"
          element={(
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="developer"
          element={(
            <ProtectedRoute>
              <DeveloperDashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="creator"
          element={(
            <ProtectedRoute>
              <DeveloperDashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="admin"
          element={(
            <ProtectedRoute role="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="settings"
          element={(
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
