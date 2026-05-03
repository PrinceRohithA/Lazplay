import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import { useStorefront } from "../context/StorefrontContext.jsx";
import { communityThreads, sections } from "../data/platformData.js";

function formatCurrency(value) {
  return Number(value) === 0 ? "Free" : `$${Number(value).toFixed(2)}`;
}

function formatStars(value) {
  return `${Number(value || 0).toFixed(1)} / 5`;
}

function filterGames(catalog, searchTerm, quickFilter) {
  const query = searchTerm.trim().toLowerCase();

  return catalog.filter((game) => {
    const matchesQuery =
      !query ||
      [game.title, game.developer, game.genre, ...game.tags].join(" ").toLowerCase().includes(query);

    const matchesFilter =
      quickFilter === "all" ||
      (quickFilter === "free" && game.price === 0) ||
      (quickFilter === "paid" && game.price > 0) ||
      (quickFilter === "indie" && game.tags.includes("Indie")) ||
      (quickFilter === "top" && game.rating >= 4.7);

    return matchesQuery && matchesFilter;
  });
}

function GameTile({ game, compact = false }) {
  const { claimGame, isAuthenticated, toggleCart, toggleWishlist, wishlistIds } = useStorefront();
  const navigate = useNavigate();
  const inWishlist = wishlistIds.includes(game.id);

  const primaryAction = async () => {
    if (!isAuthenticated && game.price === 0) {
      if (game.publicUrl) {
        window.open(game.publicUrl, "_blank", "noopener,noreferrer");
      } else {
        navigate(`/game/${game.id}`);
      }
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (game.owned) {
      navigate(`/game/${game.id}`);
      return;
    }

    if (game.price === 0) {
      await claimGame(game.id);
      return;
    }

    await toggleCart(game.id);
  };

  return (
    <article className={`game-tile panel ${compact ? "compact" : ""}`}>
      <Link className="game-tile-cover" to={`/game/${game.id}`} style={{ background: game.art }}>
        <span>{game.title.slice(0, 1)}</span>
      </Link>
      <div className="game-tile-copy">
        <div className="game-tile-top">
          <div>
            <strong>{game.title}</strong>
            <p>{game.developer}</p>
          </div>
          <button type="button" className={`wish-toggle ${inWishlist ? "active" : ""}`} onClick={() => toggleWishlist(game.id)}>
            Save
          </button>
        </div>

        <div className="game-meta-row">
          <span>{formatCurrency(game.price)}</span>
          <span>{formatStars(game.rating)}</span>
        </div>

        <div className="tag-row">
          {game.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>

        <div className="tile-actions">
          <button type="button" className="button" onClick={primaryAction}>
            {game.owned ? "Owned" : game.price === 0 ? (isAuthenticated ? "Claim" : "Play free") : game.inCart ? "In cart" : "Add to cart"}
          </button>
          <Link className="button primary" to={`/game/${game.id}`}>
            View
          </Link>
        </div>
      </div>
    </article>
  );
}

function SectionRow({ title, games }) {
  if (!games.length) {
    return null;
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">LazPlay picks</p>
          <h2>{title}</h2>
        </div>
        <Link className="text-link" to="/store">
          Browse all
        </Link>
      </div>
      <div className="h-scroll-row">
        {games.map((game) => (
          <GameTile key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

export function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const { isAuthenticated, signInWithMockOAuth } = useStorefront();
  const [form, setForm] = useState({
    email: mode === "signup" ? "creator@lazplay.local" : "player1@lazplay.local",
    password: "",
    name: mode === "signup" ? "Moon Quarry" : "Player One",
    role: mode === "signup" ? "creator" : "player"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/library" replace />;
  }

  const submit = async (provider = "email") => {
    setLoading(true);
    setMessage("");

    try {
      await signInWithMockOAuth({
        email: form.email || "player1@lazplay.local",
        name: form.name || form.email.split("@")[0] || "Player",
        provider,
        role: form.role
      });
      navigate(form.role === "creator" ? "/creator" : "/library", { replace: true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-stage">
      <div className="panel auth-card">
        <div className="auth-hero">
          <p className="eyebrow">LazPlay account</p>
          <h1>{mode === "signup" ? "Create your account" : "Sign in to LazPlay"}</h1>
          <p>Players collect and download games. Creators publish builds, manage pages, and track reach.</p>
        </div>

        <div className="auth-switch">
          <button type="button" className={mode === "login" ? "chip active" : "chip"} onClick={() => navigate("/login")}>Login</button>
          <button type="button" className={mode === "signup" ? "chip active" : "chip"} onClick={() => navigate("/signup")}>Signup</button>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit("email");
          }}
        >
          <label>
            <span>Email</span>
            <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label>
            <span>Display name</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </label>

          <div className="segmented-control">
            {[
              ["player", "Player"],
              ["creator", "Creator"]
            ].map(([value, label]) => (
              <button key={value} type="button" className={form.role === value ? "chip active" : "chip"} onClick={() => setForm((current) => ({ ...current, role: value }))}>
                {label}
              </button>
            ))}
          </div>

          <button type="submit" className="button primary button-large" disabled={loading}>
            {loading ? "Signing in..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          {message && <p className="banner error">{message}</p>}
        </form>

        <div className="oauth-rail">
          <button type="button" className="button" onClick={() => submit("google")} disabled={loading}>
            Continue with Google
          </button>
          <button type="button" className="button" onClick={() => submit("github")} disabled={loading}>
            Continue with GitHub
          </button>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { apiMessage, apiStatus, catalog, featuredGame, quickFilter, searchTerm, setQuickFilter } = useStorefront();
  const filtered = useMemo(() => filterGames(catalog, searchTerm, quickFilter), [catalog, quickFilter, searchTerm]);
  const byIds = (ids) => ids.map((id) => filtered.find((game) => game.id === id)).filter(Boolean);

  return (
    <div className="page-grid home-page">
      {apiStatus === "offline" && apiMessage && <p className="banner error">{apiMessage}</p>}

      {!featuredGame && (
        <section className="panel section-card">
          <p className="eyebrow">Storefront</p>
          <h1>No games published yet</h1>
          <p className="muted-text">Creators can upload builds, then admins can review and approve them.</p>
        </section>
      )}

      {featuredGame && <section className="hero-banner panel" style={{ background: featuredGame.art }}>
        <div className="hero-banner-copy">
          <p className="eyebrow">Featured game</p>
          <h1>{featuredGame.title}</h1>
          <p>{featuredGame.description}</p>
          <div className="hero-actions">
            <Link className="button primary" to={`/game/${featuredGame.id}`}>
              View details
            </Link>
            <Link className="button" to="/store">
              Open store
            </Link>
          </div>
        </div>
        <div className="hero-banner-card">
          <div>
            <span>{featuredGame.developer}</span>
            <strong>{formatCurrency(featuredGame.price)}</strong>
          </div>
          <p>{featuredGame.genre}</p>
        </div>
      </section>}

      <div className="filter-strip panel">
        {[
          ["all", "All"],
          ["free", "Free"],
          ["paid", "Paid"],
          ["indie", "Indie Picks"],
          ["top", "Top Rated"]
        ].map(([value, label]) => (
          <button key={value} type="button" className={quickFilter === value ? "chip active" : "chip"} onClick={() => setQuickFilter(value)}>
            {label}
          </button>
        ))}
      </div>

      <SectionRow title="Trending Games" games={byIds(sections.trending)} />
      <SectionRow title="New Releases" games={byIds(sections.newReleases)} />
      <SectionRow title="Top Free Games" games={byIds(sections.topFree)} />
      <SectionRow title="Indie Picks" games={byIds(sections.indie)} />
      <SectionRow title="Recommended for You" games={filtered.slice(0, 5)} />
    </div>
  );
}

export function StorePage() {
  const { catalog, claimGame, isAuthenticated, searchTerm, toggleCart, toggleWishlist, wishlistIds } = useStorefront();
  const navigate = useNavigate();
  const [genre, setGenre] = useState("All");
  const [price, setPrice] = useState("All");
  const [platform, setPlatform] = useState("All");
  const [tag, setTag] = useState("All");
  const [sort, setSort] = useState("Popularity");
  const [layout, setLayout] = useState("grid");

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return catalog
      .filter((game) => {
        const matchesQuery =
          !query ||
          [game.title, game.developer, game.genre, ...game.tags].join(" ").toLowerCase().includes(query);
        const matchesGenre = genre === "All" || game.genre.toLowerCase().includes(genre.toLowerCase());
        const matchesPrice = price === "All" || (price === "Free" && game.price === 0) || (price === "Paid" && game.price > 0);
        const matchesPlatform = platform === "All" || game.platforms.includes(platform);
        const matchesTag = tag === "All" || game.tags.includes(tag);

        return matchesQuery && matchesGenre && matchesPrice && matchesPlatform && matchesTag;
      })
      .sort((left, right) => {
        if (sort === "New") {
          return Number(right.id) - Number(left.id);
        }
        if (sort === "Price") {
          return left.price - right.price;
        }
        return right.rating - left.rating;
      });
  }, [catalog, genre, platform, price, searchTerm, sort, tag]);

  const buyAction = async (game) => {
    if (!isAuthenticated && game.price === 0) {
      if (game.publicUrl) {
        window.open(game.publicUrl, "_blank", "noopener,noreferrer");
      } else {
        navigate(`/game/${game.id}`);
      }
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (game.owned) {
      navigate("/library");
      return;
    }

    if (game.price === 0) {
      await claimGame(game.id);
      return;
    }

    await toggleCart(game.id);
  };

  return (
    <div className="page-grid store-page">
      <aside className="panel filter-sidebar">
        <div className="sidebar-heading">
          <p className="eyebrow">Discovery filters</p>
          <h2>Store</h2>
        </div>

        {[
          ["Genre", genre, setGenre, ["All", "Action Roguelite", "Adventure", "Simulation", "Indie RPG", "Strategy", "Arcade", "Relaxing Sim", "Puzzle Adventure"]],
          ["Price", price, setPrice, ["All", "Free", "Paid"]],
          ["Platform", platform, setPlatform, ["All", "Windows", "Linux", "Web"]],
          ["Tags", tag, setTag, ["All", "Indie", "Story Rich", "Free", "Boss Rush", "Relaxing", "Narrative"]]
        ].map(([label, value, setter, options]) => (
          <label key={label} className="filter-group">
            <span>{label}</span>
            <select value={value} onChange={(event) => setter(event.target.value)}>
              {options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}

        <div className="filter-group">
          <span>Sort by</span>
          <div className="segmented-control">
            {["Popularity", "New", "Price"].map((option) => (
              <button key={option} type="button" className={sort === option ? "chip active" : "chip"} onClick={() => setSort(option)}>
                {option}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="store-main">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Discovery</p>
            <h1>Explore the store</h1>
          </div>
          <div className="layout-toggle">
            <button type="button" className={layout === "grid" ? "chip active" : "chip"} onClick={() => setLayout("grid")}>Grid</button>
            <button type="button" className={layout === "list" ? "chip active" : "chip"} onClick={() => setLayout("list")}>List</button>
          </div>
        </div>

        <div className={layout === "grid" ? "game-grid" : "game-list"}>
          {filtered.map((game) => (
            <article key={game.id} className="panel store-card">
              <Link className="store-card-cover" to={`/game/${game.id}`} style={{ background: game.art }}>
                <span>{game.title.slice(0, 1)}</span>
              </Link>
              <div className="store-card-copy">
                <div className="game-tile-top">
                  <div>
                    <strong>{game.title}</strong>
                    <p>{game.developer}</p>
                  </div>
                  <span className="rating-pill">{formatStars(game.rating)}</span>
                </div>
                <p className="description-line">{game.description}</p>
                <div className="tag-row">
                  {game.tags.slice(0, 3).map((item) => (
                    <span key={item} className="tag-pill">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="tile-actions">
                  <button type="button" className="button" onClick={() => toggleWishlist(game.id)}>
                    {wishlistIds.includes(game.id) ? "Saved" : "Save"}
                  </button>
                  <button type="button" className="button primary" onClick={() => buyAction(game)}>
                    {game.owned ? "In library" : game.price === 0 ? (isAuthenticated ? "Claim" : "Play free") : game.inCart ? "In cart" : formatCurrency(game.price)}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function GameDetailsPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { catalog, claimGame, downloadGame, isAuthenticated, toggleCart, toggleWishlist, wishlistIds } = useStorefront();
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [working, setWorking] = useState(false);
  const game = catalog.find((item) => item.id === Number(gameId));

  if (!game) {
    return <Navigate to="/store" replace />;
  }

  const primaryAction = async () => {
    if (!isAuthenticated && game.price === 0) {
      if (game.publicUrl) {
        window.open(game.publicUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setWorking(true);
    try {
      if (game.owned) {
        await downloadGame(game.id);
      } else if (game.price === 0) {
        await claimGame(game.id);
      } else {
        await toggleCart(game.id);
        navigate("/cart");
      }
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="page-grid details-page">
      <section className="panel details-media">
        <div className="cover-hero" style={{ background: game.art }}>
          <span>{game.title.slice(0, 1)}</span>
        </div>
        <div className="screenshot-strip">
          {game.screenshots.map((shot, index) => (
            <button
              key={shot}
              type="button"
              className={`shot-card ${selectedScreenshot === index ? "active" : ""}`}
              onClick={() => setSelectedScreenshot(index)}
            >
              <span>{shot}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel details-copy">
        <p className="eyebrow">Game details</p>
        <h1>{game.title}</h1>
        <p className="muted-text">{game.developer} - {game.genre}</p>
        <div className="detail-price-row">
          <strong>{formatCurrency(game.price)}</strong>
          <span>{formatStars(game.rating)} - {game.reviewCount} reviews</span>
        </div>

        <p className="description-line">{game.description}</p>

        <div className="action-row">
          <button type="button" className="button primary" disabled={working} onClick={primaryAction}>
            {working ? "Preparing..." : game.owned ? "Download" : game.price === 0 ? (isAuthenticated ? "Claim" : "Play free") : "Buy"}
          </button>
          <button type="button" className="button" onClick={() => toggleWishlist(game.id)}>
            {wishlistIds.includes(game.id) ? "Remove saved" : "Save"}
          </button>
          {game.demo && (
            <button type="button" className="button" onClick={() => navigate(`/store?demo=${game.id}`)}>
              Play demo
            </button>
          )}
        </div>

        <section className="detail-block">
          <h2>Description</h2>
          <p>{game.description}</p>
        </section>

        <section className="detail-block">
          <h2>System Requirements</h2>
          <p>Minimum: {game.requirements.minimum}</p>
          <p>Recommended: {game.requirements.recommended}</p>
        </section>

        <section className="detail-block">
          <h2>Reviews</h2>
          <div className="stack-list">
            {game.reviews.length ? (
              game.reviews.map((review) => (
                <article key={review.author} className="review-card">
                  <strong>{review.author}</strong>
                  <p>{review.text}</p>
                  <span>{review.rating} / 5</span>
                </article>
              ))
            ) : (
              <p className="empty-state">No reviews yet.</p>
            )}
          </div>
        </section>

        <section className="detail-block">
          <h2>Update Logs</h2>
          <ul className="bullet-list">
            {game.updates.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  );
}

export function CartPage() {
  const navigate = useNavigate();
  const { cartItems, cartTotal, removeFromCart } = useStorefront();
  const [coupon, setCoupon] = useState("");
  const discount = coupon.trim().toUpperCase() === "LAZ10" ? cartTotal * 0.1 : 0;

  return (
    <div className="page-grid cart-page">
      <section className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cart</p>
            <h1>Selected games</h1>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <p className="empty-state">Your cart is empty. Open the store and add a few games.</p>
        ) : (
          <div className="stack-list">
            {cartItems.map((game) => (
              <article key={game.id} className="cart-row">
                <div>
                  <strong>{game.title}</strong>
                  <p>{formatCurrency(game.price)}</p>
                </div>
                <button type="button" className="button" onClick={() => removeFromCart(game.id)}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="panel summary-card">
        <h2>Price breakdown</h2>
        <div className="summary-row"><span>Subtotal</span><strong>{formatCurrency(cartTotal)}</strong></div>
        <div className="summary-row"><span>Coupon</span><strong>-{formatCurrency(discount)}</strong></div>
        <div className="summary-row total"><span>Total</span><strong>{formatCurrency(Math.max(cartTotal - discount, 0))}</strong></div>

        <label className="coupon-field">
          <span>Apply coupon</span>
          <input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="LAZ10" />
        </label>

        <button type="button" className="button primary button-large" disabled={!cartItems.length} onClick={() => navigate("/checkout")}>
          Checkout
        </button>
      </aside>
    </div>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, cartTotal, checkoutCart } = useStorefront();
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");

  if (cartItems.length === 0 && !confirmed) {
    return <Navigate to="/store" replace />;
  }

  const pay = async () => {
    setMessage("");
    try {
      await checkoutCart();
      setConfirmed(true);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="page-grid checkout-page">
      <section className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Complete payment</h1>
          </div>
        </div>

        <div className="payment-grid">
          {[
            ["UPI", "Fast mobile payment"],
            ["Card", "Credit or debit card"],
            ["Wallet", "Stored wallet balance"]
          ].map(([value, label]) => (
            <button key={value} type="button" className={`payment-card ${paymentMethod === value ? "active" : ""}`} onClick={() => setPaymentMethod(value)}>
              <strong>{value}</strong>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {confirmed ? (
          <div className="confirmation-panel">
            <h2>Order confirmed</h2>
            <p>Your library has been updated.</p>
            <button type="button" className="button primary" onClick={() => navigate("/library")}>Go to library</button>
          </div>
        ) : (
          <button type="button" className="button primary button-large" onClick={pay}>
            Pay {formatCurrency(cartTotal)} with {paymentMethod}
          </button>
        )}
        {message && <p className="banner error">{message}</p>}
      </section>

      <aside className="panel summary-card">
        <h2>Order summary</h2>
        <div className="stack-list">
          {cartItems.map((game) => (
            <article key={game.id} className="summary-item">
              <strong>{game.title}</strong>
              <span>{formatCurrency(game.price)}</span>
            </article>
          ))}
        </div>
        <div className="summary-row total"><span>Amount due</span><strong>{formatCurrency(cartTotal)}</strong></div>
      </aside>
    </div>
  );
}

export function LibraryPage() {
  const { downloadGame, ownedGames, installedGames, toggleInstalled } = useStorefront();
  const [view, setView] = useState("Installed");

  const visibleGames = useMemo(() => {
    if (view === "Installed") {
      return installedGames;
    }
    if (view === "Purchased") {
      return ownedGames;
    }
    return ownedGames.filter((game) => game.wishlist);
  }, [installedGames, ownedGames, view]);

  return (
    <div className="page-grid library-page">
      <aside className="panel filter-sidebar compact">
        <p className="eyebrow">Library</p>
        <h1>Your collection</h1>
        {["Installed", "Purchased", "Favorites"].map((item) => (
          <button key={item} type="button" className={view === item ? "chip active wide" : "chip wide"} onClick={() => setView(item)}>
            {item}
          </button>
        ))}
      </aside>

      <section className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Play now</p>
            <h2>{view}</h2>
          </div>
        </div>
        <div className="library-list">
          {visibleGames.length ? (
            visibleGames.map((game) => (
              <article key={game.id} className="library-row">
                <div className="library-cover" style={{ background: game.art }}>
                  <span>{game.title.slice(0, 1)}</span>
                </div>
                <div className="library-copy">
                  <strong>{game.title}</strong>
                  <p>{game.developer}</p>
                </div>
                <div className="tile-actions">
                  <button type="button" className="button" onClick={() => toggleInstalled(game.id)}>
                    {game.installed ? "Uninstall" : "Install"}
                  </button>
                  <button type="button" className="button primary" onClick={() => downloadGame(game.id)}>Download</button>
                  <button type="button" className="button">Cloud sync</button>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-state">Nothing here yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export function ProfilePage() {
  const { currentUser, ownedGames, wishlistItems } = useStorefront();
  const [tab, setTab] = useState("Owned Games");
  const content = tab === "Owned Games" ? ownedGames : tab === "Reviews" ? [] : wishlistItems;

  return (
    <div className="page-grid profile-page">
      <section className="panel profile-card">
        <div className="profile-avatar large">{currentUser.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{currentUser.name}</h1>
          <p className="muted-text">{currentUser.email}</p>
        </div>
        <button type="button" className="button primary">Edit profile</button>
      </section>

      <section className="panel section-card">
        <div className="tab-row">
          {["Owned Games", "Reviews", "Wishlist"].map((item) => (
            <button key={item} type="button" className={tab === item ? "chip active" : "chip"} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="stack-list">
          {content.length ? (
            content.map((item) => (
              <article key={item.id || item.title} className="summary-item">
                <strong>{item.title || item.name}</strong>
                <span>{item.developer || "Player review"}</span>
              </article>
            ))
          ) : (
            <p className="empty-state">No entries yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export function DeveloperDashboardPage() {
  const { archiveCreatorGame, creatorGames, currentUser, uploadGame, updateCreatorGame } = useStorefront();
  const [panel, setPanel] = useState("Upload Game");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "0",
    version: "1.0.0",
    genre: "Indie",
    tags: "Indie",
    platforms: "Windows",
    status: "pending",
    file: null
  });
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const submitUpload = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!form.file) {
      setMessage("Choose a .zip build before publishing.");
      return;
    }

    const payload = new FormData();
    payload.set("name", form.name || "Untitled Game");
    payload.set("description", form.description);
    payload.set("price", form.price || "0");
    payload.set("version", form.version || "1.0.0");
    payload.set("genre", form.genre || "Indie");
    payload.set("tags", form.tags);
    payload.set("platforms", form.platforms);
    payload.set("status", form.status);
    payload.set("file", form.file);

    setWorking(true);
    try {
      await uploadGame(payload);
      setMessage("Game uploaded for admin approval.");
      setForm((current) => ({ ...current, name: "", description: "", file: null }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="page-grid developer-page">
      <aside className="panel filter-sidebar compact">
        <p className="eyebrow">Creator dashboard</p>
        <h1>{currentUser.name}</h1>
        {["Upload Game", "Manage Games", "Analytics"].map((item) => (
          <button key={item} type="button" className={panel === item ? "chip active wide" : "chip wide"} onClick={() => setPanel(item)}>
            {item}
          </button>
        ))}
      </aside>

      <section className="panel section-card">
        {panel === "Upload Game" && (
          <form className="stack-list upload-form" onSubmit={submitUpload}>
            <h2>Upload game</h2>
            <div className="settings-grid">
              {[
                ["Title", "name"],
                ["Version", "version"],
                ["Price", "price"],
                ["Genre", "genre"],
                ["Tags", "tags"],
                ["Platforms", "platforms"]
              ].map(([label, key]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                </label>
              ))}
            </div>
            <label>
              <span>Description</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              <span>Visibility</span>
              <select value={form.status} disabled>
                <option value="pending">Pending admin approval</option>
              </select>
            </label>
            <label>
              <span>Build file</span>
              <input type="file" accept=".zip" onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} />
            </label>
            <button type="submit" className="button primary button-large" disabled={working}>
              {working ? "Submitting..." : "Submit for approval"}
            </button>
            {message && <p className={message.includes("published") ? "banner success" : "banner error"}>{message}</p>}
          </form>
        )}

        {panel === "Manage Games" && (
          <div className="stack-list">
            {creatorGames.length ? (
              creatorGames.map((game) => (
                <article key={game.id} className="summary-item creator-row">
                  <div>
                    <strong>{game.title || game.name}</strong>
                    <span>Version {game.version || "1.0.0"} - {game.downloadCount || game.downloads || 0} downloads</span>
                  </div>
                  <div className="tile-actions">
                    <button type="button" className="button" onClick={() => updateCreatorGame(game.id, { status: "published" })}>Publish</button>
                    <button type="button" className="button" onClick={() => updateCreatorGame(game.id, { status: "draft" })}>Draft</button>
                    <button type="button" className="button danger" onClick={() => archiveCreatorGame(game.id)}>Archive</button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No creator games yet.</p>
            )}
          </div>
        )}

        {panel === "Analytics" && (
          <div className="analytics-grid">
            <article className="stat-card"><span className="stat-label">Games</span><strong>{creatorGames.length}</strong></article>
            <article className="stat-card"><span className="stat-label">Downloads</span><strong>{creatorGames.reduce((sum, game) => sum + Number(game.downloadCount || game.downloads || 0), 0)}</strong></article>
            <article className="stat-card accent"><span className="stat-label">Published</span><strong>{creatorGames.filter((game) => (game.status || "published") === "published").length}</strong></article>
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminDashboardPage() {
  const { catalog } = useStorefront();
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([apiRequest("/admin/games"), apiRequest("/admin/users")])
      .then(([gamesPayload, usersPayload]) => {
        setGames(gamesPayload.items || []);
        setUsers(usersPayload.items || []);
      })
      .catch((error) => {
        setMessage(error.message);
        setGames(catalog);
      });
  }, [catalog]);

  const setStatus = async (gameId, status) => {
    const game = await apiRequest(`/admin/games/${gameId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setGames((current) => current.map((item) => (item.id === game.id ? game : item)));
  };

  const pendingGames = games.filter((game) => (game.status || "").toLowerCase() === "pending");

  return (
    <div className="page-grid admin-page">
      <aside className="panel filter-sidebar compact">
        <p className="eyebrow">Pending approvals</p>
        <h2>{pendingGames.length} waiting</h2>
        <div className="stack-list">
          {pendingGames.length ? (
            pendingGames.map((game) => (
              <article key={game.id} className="summary-item">
                <strong>{game.title || game.name}</strong>
                <span>{game.developer || "Creator"}</span>
              </article>
            ))
          ) : (
            <p className="empty-state">No pending submissions.</p>
          )}
        </div>
      </aside>

      <section className="panel section-card">
        <p className="eyebrow">Admin</p>
        <h1>Moderation queue</h1>
        {message && <p className="banner error">{message}</p>}
        <div className="stack-list">
          {games.map((game) => (
            <article key={game.id} className="summary-item creator-row">
              <div>
                <strong>{game.title || game.name}</strong>
                <span>{game.developer} - {game.status || "published"}</span>
              </div>
              <div className="tile-actions">
                <button type="button" className="button" onClick={() => setStatus(game.id, "published")}>Publish</button>
                <button type="button" className="button" onClick={() => setStatus(game.id, "pending")}>Mark pending</button>
                <button type="button" className="button" onClick={() => setStatus(game.id, "unlisted")}>Unlist</button>
                <button type="button" className="button danger" onClick={() => setStatus(game.id, "archived")}>Archive</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="panel summary-card">
        <h2>Users</h2>
        <div className="stack-list">
          {users.map((user) => (
            <article key={user.id} className="summary-item">
              <strong>{user.name}</strong>
              <span>{user.role} - {user.email}</span>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function CommunityPage() {
  const { isAuthenticated } = useStorefront();
  const [category, setCategory] = useState("Discussions");
  const [threads, setThreads] = useState(communityThreads);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    apiRequest("/community/threads", { auth: false })
      .then((payload) => {
        if (payload.items?.length) {
          setThreads(payload.items);
        }
      })
      .catch(() => {});
  }, []);

  const postThread = async () => {
    if (!draft.trim()) {
      return;
    }

    const localThread = {
      id: Date.now(),
      title: draft,
      author: "You",
      replies: 0,
      likes: 0,
      category
    };
    setThreads((current) => [localThread, ...current]);
    setDraft("");

    if (isAuthenticated) {
      apiRequest("/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft, category })
      }).catch(() => {});
    }
  };

  return (
    <div className="page-grid community-page">
      <section className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Community</p>
            <h1>Discussions and forums</h1>
          </div>
          <div className="layout-toggle">
            {["Discussions", "Forums", "Comments"].map((item) => (
              <button key={item} type="button" className={category === item ? "chip active" : "chip"} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="community-compose">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Start a thread" />
          <button type="button" className="button primary" onClick={postThread}>Post</button>
        </div>

        <div className="stack-list">
          {threads.filter((thread) => thread.category === category).map((thread) => (
            <article key={thread.id} className="community-thread">
              <div>
                <p className="eyebrow">{thread.category}</p>
                <strong>{thread.title}</strong>
                <p>By {thread.author} - {thread.replies} replies</p>
              </div>
              <div className="tile-actions">
                <button type="button" className="button" onClick={() => setThreads((current) => current.map((item) => item.id === thread.id ? { ...item, likes: item.likes + 1 } : item))}>
                  Like {thread.likes}
                </button>
                <button type="button" className="button primary">Comment</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function NotificationsPage() {
  const { dismissNotification, notifications } = useStorefront();
  const [filter, setFilter] = useState("All");
  const visible = filter === "All" ? notifications : notifications.filter((notification) => notification.type === filter);

  return (
    <div className="page-grid notifications-page">
      <section className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Notifications</p>
            <h1>Recent activity</h1>
          </div>
          <div className="layout-toggle">
            {["All", "Update", "Purchase", "Community", "Library"].map((item) => (
              <button key={item} type="button" className={filter === item ? "chip active" : "chip"} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="stack-list">
          {visible.map((item) => (
            <article key={item.id} className="notification-card">
              <span className={`notification-dot ${item.unread ? "unread" : ""}`} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <div className="notification-actions">
                <span>{item.time}</span>
                <button type="button" className="button" onClick={() => dismissNotification(item.id)}>Dismiss</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SettingsPage() {
  const [privacy, setPrivacy] = useState(true);
  const [payments, setPayments] = useState(true);
  const [devices, setDevices] = useState(true);

  return (
    <div className="page-grid settings-page">
      <section className="panel section-card">
        <p className="eyebrow">Settings</p>
        <h1>Account</h1>
        <div className="settings-grid">
          <label>
            <span>Change password</span>
            <input placeholder="New password" type="password" />
          </label>
          <label>
            <span>Manage devices</span>
            <input placeholder="Device name" />
          </label>
        </div>
        <div className="toggle-list">
          <button type="button" className="toggle-row" onClick={() => setPrivacy((value) => !value)}>
            <span>Privacy mode</span>
            <strong>{privacy ? "On" : "Off"}</strong>
          </button>
          <button type="button" className="toggle-row" onClick={() => setPayments((value) => !value)}>
            <span>Payment methods</span>
            <strong>{payments ? "Saved" : "Hidden"}</strong>
          </button>
          <button type="button" className="toggle-row" onClick={() => setDevices((value) => !value)}>
            <span>Trusted devices</span>
            <strong>{devices ? "Allowed" : "Locked"}</strong>
          </button>
        </div>
      </section>
    </div>
  );
}
