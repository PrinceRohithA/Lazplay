import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth.js";
import { apiRequest } from "../lib/api.js";

function formatBytes(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** idx;
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingGameId, setWorkingGameId] = useState(null);

  const ownedCount = useMemo(() => games.filter((game) => game.owned).length, [games]);

  const loadGames = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await apiRequest("/games");
      setGames(payload.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const logout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  const showDetails = async (gameId) => {
    setWorkingGameId(gameId);
    setError("");

    try {
      const detail = await apiRequest(`/games/${gameId}`);
      setSelectedGame(detail);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingGameId(null);
    }
  };

  const downloadGame = async (gameId) => {
    setWorkingGameId(gameId);
    setError("");

    try {
      const payload = await apiRequest(`/download/${gameId}`);
      window.location.assign(payload.downloadUrl);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingGameId(null);
    }
  };

  return (
    <main className="screen games-screen">
      <section className="hero panel">
        <div className="hero-copy">
          <p className="eyebrow">LazPlay storefront</p>
          <h1>Black glass, sharp hierarchy, fast access.</h1>
          <p className="lead">
            A curated library view inspired by Steam's utility and itch.io's indie energy, tuned for self-hosted game distribution.
          </p>
        </div>

        <div className="hero-stats">
          <article className="stat-card">
            <span className="stat-label">Owned</span>
            <strong>{ownedCount}</strong>
          </article>
          <article className="stat-card accent">
            <span className="stat-label">Visible games</span>
            <strong>{games.length}</strong>
          </article>
          <article className="stat-card">
            <span className="stat-label">Session</span>
            <strong>Secure JWT</strong>
          </article>
        </div>
      </section>

      <header className="topbar panel">
        <div>
          <p className="eyebrow">Game distribution</p>
          <h2>Library</h2>
          <p className="subtext">{ownedCount} owned of {games.length} total games</p>
        </div>
        <div className="topbar-actions">
          <button type="button" className="button" onClick={loadGames} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="button danger" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error && <p className="banner error">{error}</p>}

      {loading ? (
        <section className="panel state">Loading games...</section>
      ) : (
        <section className="grid">
          {games.map((game, index) => (
            <article className="panel game-card" key={game.id} style={{ animationDelay: `${index * 70}ms` }}>
              <div className="card-art">
                <span>{game.name.slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="card-header">
                <h2>{game.name}</h2>
                <span className={`pill ${game.owned ? "ok" : "muted"}`}>{game.owned ? "Owned" : "No Access"}</span>
              </div>
              <p className="subtext">Version {game.version}</p>
              <p className="meta">Size: {formatBytes(Number(game.size))}</p>
              <div className="card-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => showDetails(game.id)}
                  disabled={workingGameId === game.id}
                >
                  Details
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => downloadGame(game.id)}
                  disabled={!game.owned || workingGameId === game.id}
                >
                  Download
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedGame && (
        <section className="panel details-panel">
          <div className="card-header">
            <h2>{selectedGame.name}</h2>
            <button type="button" className="button" onClick={() => setSelectedGame(null)}>
              Close
            </button>
          </div>
          <p className="subtext">Version {selectedGame.version}</p>
          <p className="meta">ID: {selectedGame.id}</p>
          <p className="meta">Size: {formatBytes(Number(selectedGame.size))}</p>
          <p className="meta">Path: /games/{selectedGame.filePath}</p>
          <p className="meta">Created: {new Date(selectedGame.createdAt).toLocaleString()}</p>
        </section>
      )}
    </main>
  );
}
