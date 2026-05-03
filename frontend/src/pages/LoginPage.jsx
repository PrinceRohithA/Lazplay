import { getApiBaseUrl } from "../lib/api.js";

export default function LoginPage() {
  const startLogin = () => {
    window.location.assign(`${getApiBaseUrl()}/auth/login`);
  };

  return (
    <main className="screen auth-screen">
      <section className="panel auth-panel">
        <div className="brand-lockup">
          <div className="brand-mark">L</div>
          <div>
            <p className="eyebrow">LazPlay</p>
            <h1>Built like a boutique launcher.</h1>
          </div>
        </div>

        <p className="lead">
          A dark, high-contrast storefront for self-hosted games with the density of Steam and the personality of itch.io.
        </p>

        <div className="feature-grid">
          <article className="feature-chip">
            <span className="feature-label">Library</span>
            <strong>Curated game cards</strong>
          </article>
          <article className="feature-chip">
            <span className="feature-label">Access</span>
            <strong>JWT-secured downloads</strong>
          </article>
          <article className="feature-chip">
            <span className="feature-label">Style</span>
            <strong>Black glass panels</strong>
          </article>
        </div>

        <button className="button primary button-large" type="button" onClick={startLogin}>
          Sign in with OAuth
        </button>
      </section>
    </main>
  );
}
