import { getApiBaseUrl } from "../lib/api.js";

export default function LoginPage() {
  const startLogin = () => {
    window.location.assign(`${getApiBaseUrl()}/auth/login`);
  };

  return (
    <main className="screen auth-screen">
      <section className="panel auth-panel">
        <p className="eyebrow">Self-hosted launcher</p>
        <h1>LazPlay Local</h1>
        <p className="subtext">
          Sign in through the backend OAuth flow. A JWT token will be issued and used for all protected API requests.
        </p>
        <button className="button primary" type="button" onClick={startLogin}>
          Sign in with OAuth
        </button>
      </section>
    </main>
  );
}
