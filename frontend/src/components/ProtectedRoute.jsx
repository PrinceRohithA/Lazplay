import { Navigate } from "react-router-dom";
import { getStoredToken, getStoredUser, roleAtLeast } from "../lib/auth.js";

export default function ProtectedRoute({ children, role = "player" }) {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!roleAtLeast(user?.role, role)) {
    return <Navigate to="/library" replace />;
  }

  return children;
}
