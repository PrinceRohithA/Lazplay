import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import { useStorefront } from "../context/StorefrontContext.jsx";
import { developerGames, gameCatalog, getGameById, getSectionGames, communityThreads, notificationsSeed, sections } from "../data/platformData.js";

function formatCurrency(value) {
  return value === 0 ? "Free" : `$${value.toFixed(2)}`;
}

function formatStars(value) {
  return `${value.toFixed(1)} / 5`;
}

function GameTile({ game, compact = false, actions = null }) {
  const { toggleWishlist, wishlistIds, cartIds, toggleCart } = useStorefront();
  const inWishlist = wishlistIds.includes(game.id);
  const inCart = cartIds.includes(game.id);

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
            ♥
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

        {actions || (
          <div className="tile-actions">
            <button type="button" className="button" onClick={() => toggleCart(game.id)}>
              {inCart ? "Remove" : "Add to Cart"}
            </button>
            <Link className="button primary" to={`/game/${game.id}`}>
              View
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

function SectionRow({ title, ids }) {
  const games = getSectionGames(ids);

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
    email: "player1@lazplay.local",
    password: "",
    name: mode === "signup" ? "Player One" : "Player One"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/library" replace />;
  }

  const submit = async (provider = "local") => {
    setLoading(true);
    setMessage("");

    try {
      await signInWithMockOAuth({
        email: form.email || "player1@lazplay.local",
        name: form.name || form.email.split("@")[0] || "Player",
        provider
      });
      navigate("/library", { replace: true });
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
          <h1>{mode === "signup" ? "Create your player identity." : "Sign in to your library."}</h1>
          <p>
            Email/password UI with OAuth entry points, backed by the internal JWT session flow on <strong>/api</strong>.
          </p>
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
            Email
            <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          {mode === "signup" && (
            <label>
              Username
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
          )}
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </label>

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
  const { featuredGame, quickFilter, searchTerm, setQuickFilter, toggleWishlist, wishlistIds } = useStorefront();

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return gameCatalog.filter((game) => {
      const matchesQuery =
        !query ||
        [game.title, game.developer, game.genre, ...game.tags].join(" ").toLowerCase().includes(query);

      const matchesQuickFilter =
        quickFilter === "all" ||
        (quickFilter === "free" && game.price === 0) ||
        (quickFilter === "paid" && game.price > 0) ||
        (quickFilter === "indie" && game.tags.includes("Indie")) ||
        (quickFilter === "top" && game.rating >= 4.7);

      return matchesQuery && matchesQuickFilter;
    });
  }, [quickFilter, searchTerm]);

  return (
    <div className="page-grid home-page">
      <section className="hero-banner panel" style={{ background: featuredGame.art }}>
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
      </section>

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

      <SectionRow title="Trending Games" ids={sections.trending.filter((id) => filtered.some((game) => game.id === id))} />
      <SectionRow title="New Releases" ids={sections.newReleases.filter((id) => filtered.some((game) => game.id === id))} />
      <SectionRow title="Top Free Games" ids={sections.topFree.filter((id) => filtered.some((game) => game.id === id))} />
      <SectionRow title="Indie Picks" ids={sections.indie.filter((id) => filtered.some((game) => game.id === id))} />
      <SectionRow title="Recommended for You" ids={sections.recommended.filter((id) => wishlistIds.includes(id) || filtered.some((game) => game.id === id))} />
    </div>
  );
}

export function StorePage() {
  const { catalog, searchTerm, toggleCart, toggleWishlist, wishlistIds } = useStorefront();
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
        const matchesPrice =
          price === "All" ||
          (price === "Free" && game.price === 0) ||
          (price === "Paid" && game.price > 0);
        const matchesPlatform = platform === "All" || game.platforms.includes(platform);
        const matchesTag = tag === "All" || game.tags.includes(tag);

        return matchesQuery && matchesGenre && matchesPrice && matchesPlatform && matchesTag;
      })
      .sort((left, right) => {
        if (sort === "New") {
          return right.id - left.id;
        }
        if (sort === "Price") {
          return left.price - right.price;
        }
        return right.rating - left.rating;
      });
  }, [catalog, genre, platform, price, searchTerm, sort, tag]);

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
            {[
              "Popularity",
              "New",
              "Price"
            ].map((option) => (
              <button key={option} type="button" className={sort === option ? "chip active" : "chip"} onClick={() => setSort(option)}>
                {option}
              </button>
            ))}
          </div>
        </div>

        <p className="sidebar-note">Real-time search follows the global LazPlay header search bar.</p>
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
                    {wishlistIds.includes(game.id) ? "Wishlisted" : "Wishlist"}
                  </button>
                  <button type="button" className="button primary" onClick={() => toggleCart(game.id)}>
                    {game.price === 0 ? "Install" : formatCurrency(game.price)}
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
  const { toggleWishlist, toggleCart, wishlistIds } = useStorefront();
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [working, setWorking] = useState(false);
  const game = getGameById(gameId);

  if (!game) {
    return <Navigate to="/store" replace />;
  }

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
        <p className="muted-text">{game.developer} · {game.genre}</p>
        <div className="detail-price-row">
          <strong>{formatCurrency(game.price)}</strong>
          <span>{formatStars(game.rating)} · {game.reviewCount} reviews</span>
        </div>

        <p className="description-line">{game.description}</p>

        <div className="action-row">
          <button
            type="button"
            className="button primary"
            disabled={working}
            onClick={async () => {
              if (!game.owned) {
                toggleCart(game.id);
                navigate("/cart");
                return;
              }

              setWorking(true);
              try {
                const payload = await apiRequest(`/download/${game.id}`);
                window.location.assign(payload.downloadUrl);
              } finally {
                setWorking(false);
              }
            }}
          >
            {working ? "Preparing..." : game.owned ? "Download" : "Buy"}
          </button>
          <button type="button" className="button" onClick={() => toggleWishlist(game.id)}>
            {wishlistIds.includes(game.id) ? "Remove wishlist" : "Add to wishlist"}
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
            {game.reviews.map((review) => (
              <article key={review.author} className="review-card">
                <strong>{review.author}</strong>
                <p>{review.text}</p>
                <span>{review.rating} / 5</span>
              </article>
            ))}
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

        <button type="button" className="button primary button-large" onClick={() => navigate("/checkout")}>
          Checkout
        </button>
      </aside>
    </div>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, cartTotal } = useStorefront();
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [confirmed, setConfirmed] = useState(false);

  if (cartItems.length === 0) {
    return <Navigate to="/store" replace />;
  }

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
            <p>Your payment was accepted and the game library has been updated.</p>
            <button type="button" className="button primary" onClick={() => navigate("/library")}>Go to library</button>
          </div>
        ) : (
          <button type="button" className="button primary button-large" onClick={() => setConfirmed(true)}>
            Pay {formatCurrency(cartTotal)} with {paymentMethod}
          </button>
        )}
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
  const { ownedGames, installedGames, toggleInstalled } = useStorefront();
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
        {[
          "Installed",
          "Purchased",
          "Favorites"
        ].map((item) => (
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
          {visibleGames.map((game) => (
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
                <button type="button" className="button primary">Launch</button>
                <button type="button" className="button">Cloud Sync</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProfilePage() {
  const { currentUser, ownedGames, wishlistItems } = useStorefront();
  const [tab, setTab] = useState("Owned Games");

  const content =
    tab === "Owned Games" ? ownedGames : tab === "Reviews" ? developerGames : wishlistItems;

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
          {[
            "Owned Games",
            "Reviews",
            "Wishlist"
          ].map((item) => (
            <button key={item} type="button" className={tab === item ? "chip active" : "chip"} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="stack-list">
          {content.map((item) => (
            <article key={item.id || item.title} className="summary-item">
              <strong>{item.title || item.name}</strong>
              <span>{item.developer || `${item.downloads} downloads`}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function DeveloperDashboardPage() {
  const [panel, setPanel] = useState("Upload Game");
  const [publishState, setPublishState] = useState("");

  return (
    <div className="page-grid developer-page">
      <aside className="panel filter-sidebar compact">
        <p className="eyebrow">Developer dashboard</p>
        <h1>Creator tools</h1>
        {[
          "Upload Game",
          "Manage Games",
          "Analytics"
        ].map((item) => (
          <button key={item} type="button" className={panel === item ? "chip active wide" : "chip wide"} onClick={() => setPanel(item)}>
            {item}
          </button>
        ))}
      </aside>

      <section className="panel section-card">
        {panel === "Upload Game" && (
          <div className="stack-list upload-form">
            <h2>Upload page</h2>
            {[
              "Title",
              "Description",
              "Price",
              "Tags",
              "Upload build file",
              "Upload images"
            ].map((label) => (
              <label key={label}>
                <span>{label}</span>
                <input placeholder={label} />
              </label>
            ))}
            <button type="button" className="button primary button-large" onClick={() => setPublishState("Published game build and metadata.")}>
              Publish game
            </button>
            {publishState && <p className="banner success">{publishState}</p>}
          </div>
        )}

        {panel === "Manage Games" && (
          <div className="stack-list">
            {developerGames.map((game) => (
              <article key={game.id} className="summary-item">
                <strong>{game.title}</strong>
                <span>Version {game.version} · {game.downloads} downloads</span>
                <div className="tile-actions">
                  <button type="button" className="button">Update versions</button>
                  <button type="button" className="button">Revenue</button>
                </div>
              </article>
            ))}
          </div>
        )}

        {panel === "Analytics" && (
          <div className="analytics-grid">
            <article className="stat-card"><span className="stat-label">Downloads</span><strong>62K</strong></article>
            <article className="stat-card"><span className="stat-label">Revenue</span><strong>$19K</strong></article>
            <article className="stat-card accent"><span className="stat-label">Conversion</span><strong>7.8%</strong></article>
          </div>
        )}
      </section>
    </div>
  );
}

export function CommunityPage() {
  const [category, setCategory] = useState("Discussions");
  const [likes, setLikes] = useState(() => Object.fromEntries(communityThreads.map((thread) => [thread.id, thread.likes])));

  return (
    <div className="page-grid community-page">
      <section className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Community</p>
            <h1>Discussions and forums</h1>
          </div>
          <div className="layout-toggle">
            {[
              "Discussions",
              "Forums",
              "Comments"
            ].map((item) => (
              <button key={item} type="button" className={category === item ? "chip active" : "chip"} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="stack-list">
          {communityThreads.filter((thread) => thread.category === category).map((thread) => (
            <article key={thread.id} className="community-thread">
              <div>
                <p className="eyebrow">{thread.category}</p>
                <strong>{thread.title}</strong>
                <p>By {thread.author} · {thread.replies} replies</p>
              </div>
              <div className="tile-actions">
                <button type="button" className="button" onClick={() => setLikes((current) => ({ ...current, [thread.id]: current[thread.id] + 1 }))}>
                  Like {likes[thread.id]}
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
  const { notifications, dismissNotification } = useStorefront();
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
