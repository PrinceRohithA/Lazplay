import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import { readUserFromToken, saveToken, saveUser } from "../lib/auth.js";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("No token received from backend callback.");
      return;
    }

    saveToken(token);
    const tokenUser = readUserFromToken(token);
    if (tokenUser) {
      saveUser(tokenUser);
    }

    apiRequest("/auth/me")
      .then((payload) => {
        saveUser(payload.user || tokenUser);
      })
      .catch(() => {
        if (tokenUser) {
          saveUser(tokenUser);
        }
      })
      .finally(() => {
        navigate("/library", { replace: true });
      });
  }, [navigate]);

  if (error) {
    return (
      <main className="screen auth-screen">
        <section className="panel auth-panel">
          <p className="eyebrow">Authentication</p>
          <h1>Sign-in failed</h1>
          <p className="subtext">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="screen auth-screen">
      <section className="panel auth-panel">
        <p className="eyebrow">Authentication</p>
        <h1>Completing login</h1>
        <p className="subtext">Storing your session token and loading the library...</p>
      </section>
    </main>
  );
}
