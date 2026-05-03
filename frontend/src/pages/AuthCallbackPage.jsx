import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken } from "../lib/auth.js";

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
    navigate("/games", { replace: true });
  }, [navigate]);

  if (error) {
    return (
      <main className="screen auth-screen">
        <section className="panel auth-panel">
          <h1>Sign-in failed</h1>
          <p className="subtext">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="screen auth-screen">
      <section className="panel auth-panel">
        <h1>Completing login</h1>
        <p className="subtext">Storing session token and redirecting...</p>
      </section>
    </main>
  );
}
