import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { getStoredToken } from "./lib/auth.js";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import GamesPage from "./pages/GamesPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

function HomeRedirect() {
  const token = getStoredToken();
  return <Navigate to={token ? "/games" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/games"
        element={(
          <ProtectedRoute>
            <GamesPage />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
