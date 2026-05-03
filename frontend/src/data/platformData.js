export const featuredGameId = 1;

export const gameCatalog = [
  {
    id: 1,
    title: "Night Market",
    slug: "night-market",
    developer: "Moon Quarry",
    genre: "Indie RPG",
    price: 0,
    rating: 4.9,
    reviewCount: 1842,
    platforms: ["Windows", "Linux", "Web"],
    tags: ["Indie", "Story Rich", "Pixel Art"],
    description:
      "Explore a neon bazaar after midnight, trade favors with ghosts, and build a tiny empire from rumors.",
    requirements: {
      minimum: "2 GB RAM, integrated graphics, 2 GB storage",
      recommended: "8 GB RAM, dedicated graphics, SSD"
    },
    updates: ["Hotfix 1.2.4 improved save stability", "Spring patch adds co-op contracts"],
    reviews: [
      { author: "Luna", text: "Feels handcrafted from the first minute.", rating: 5 },
      { author: "Hex", text: "A quiet gem with a great soundtrack.", rating: 4.5 }
    ],
    screenshots: ["Foggy lanes", "Vendor board", "Hidden rooftop"],
    featured: true,
    owned: true,
    installed: true,
    wishlist: false,
    demo: true,
    art:
      "linear-gradient(135deg, rgba(255,125,46,0.9), rgba(19,21,28,0.7) 42%, rgba(61,224,195,0.6))"
  },
  {
    id: 2,
    title: "Rift Runners",
    slug: "rift-runners",
    developer: "Arclight Forge",
    genre: "Action Roguelite",
    price: 19.99,
    rating: 4.7,
    reviewCount: 928,
    platforms: ["Windows", "Linux"],
    tags: ["Fast-Paced", "Boss Rush", "Controller"],
    description:
      "Dash between collapsing dimensions, stack absurd relics, and survive a score-chasing gauntlet.",
    requirements: {
      minimum: "8 GB RAM, 4 GB GPU, 10 GB storage",
      recommended: "16 GB RAM, 6 GB GPU, SSD"
    },
    updates: ["New endless mode", "Relic balancing pass"],
    reviews: [
      { author: "Sable", text: "Pure momentum. Hard to stop playing.", rating: 5 },
      { author: "Orbit", text: "Slick combat and clean presentation.", rating: 4.5 }
    ],
    screenshots: ["Arena crackle", "Boss phase", "Loadout board"],
    featured: false,
    owned: true,
    installed: false,
    wishlist: true,
    demo: true,
    art:
      "linear-gradient(135deg, rgba(61,224,195,0.88), rgba(18,20,27,0.72) 44%, rgba(255,157,46,0.45))"
  },
  {
    id: 3,
    title: "Hollow Sketch",
    slug: "hollow-sketch",
    developer: "Paper Anchor",
    genre: "Puzzle Adventure",
    price: 12.5,
    rating: 4.6,
    reviewCount: 471,
    platforms: ["Windows", "Web"],
    tags: ["Puzzle", "Hand Drawn", "Atmospheric"],
    description:
      "Draw doors into existence, solve layered spatial puzzles, and uncover the story behind a disappearing city.",
    requirements: {
      minimum: "4 GB RAM, integrated graphics, 3 GB storage",
      recommended: "8 GB RAM, modern GPU"
    },
    updates: ["Chapter 3 scenes expanded", "Accessibility pass on text scaling"],
    reviews: [
      { author: "Mira", text: "Elegant, thoughtful, and lovely to look at.", rating: 4.5 },
      { author: "Ivo", text: "The puzzles are tight and surprising.", rating: 4.5 }
    ],
    screenshots: ["Sketchbook room", "Ink gate", "Map puzzle"],
    featured: false,
    owned: false,
    installed: false,
    wishlist: true,
    demo: true,
    art:
      "linear-gradient(135deg, rgba(255,255,255,0.32), rgba(18,20,27,0.8) 44%, rgba(255,125,46,0.48))"
  },
  {
    id: 4,
    title: "Signal State",
    slug: "signal-state",
    developer: "Northline Foundry",
    genre: "Strategy",
    price: 24.0,
    rating: 4.8,
    reviewCount: 605,
    platforms: ["Windows", "Linux"],
    tags: ["Base Building", "Automation", "Sci-Fi"],
    description:
      "Run a remote relay colony, route power through impossible weather, and keep the network alive.",
    requirements: {
      minimum: "8 GB RAM, 3 GB GPU, 8 GB storage",
      recommended: "16 GB RAM, SSD, multi-monitor support"
    },
    updates: ["Weather simulation now affects logistics", "Photo mode added"],
    reviews: [
      { author: "Rune", text: "Deep systems with a great rhythm.", rating: 5 },
      { author: "Pax", text: "Very sticky once the first colony starts working.", rating: 4.5 }
    ],
    screenshots: ["Relay tower", "Power grid", "Storm front"],
    featured: false,
    owned: false,
    installed: false,
    wishlist: false,
    demo: false,
    art:
      "linear-gradient(135deg, rgba(61,224,195,0.62), rgba(18,20,27,0.82) 46%, rgba(140,120,255,0.45))"
  },
  {
    id: 5,
    title: "Moon Ledger",
    slug: "moon-ledger",
    developer: "Soft Neon",
    genre: "Simulation",
    price: 0,
    rating: 4.5,
    reviewCount: 1302,
    platforms: ["Windows", "Linux", "Web"],
    tags: ["Free", "Management", "Relaxing"],
    description:
      "Run a tiny orbital storefront, balance a weird economy, and keep the moon customers happy.",
    requirements: {
      minimum: "4 GB RAM, 2 GB storage",
      recommended: "8 GB RAM, SSD"
    },
    updates: ["New weekly contracts", "Customer mood system improved"],
    reviews: [
      { author: "Tess", text: "Comforting and clever at the same time.", rating: 5 },
      { author: "Niko", text: "A free game with a lot of heart.", rating: 4.5 }
    ],
    screenshots: ["Lunar kiosk", "Ledger screen", "Orbit sunrise"],
    featured: false,
    owned: true,
    installed: false,
    wishlist: false,
    demo: false,
    art:
      "linear-gradient(135deg, rgba(255,157,46,0.7), rgba(18,20,27,0.82) 44%, rgba(61,224,195,0.52))"
  },
  {
    id: 6,
    title: "Ember Crown",
    slug: "ember-crown",
    developer: "Ash Ritual",
    genre: "Adventure",
    price: 29.99,
    rating: 4.9,
    reviewCount: 2194,
    platforms: ["Windows"],
    tags: ["Narrative", "Cinematic", "Top Pick"],
    description:
      "A kingdom on the edge of collapse, a crown that remembers everything, and a final path through fire.",
    requirements: {
      minimum: "8 GB RAM, 6 GB GPU, 20 GB storage",
      recommended: "16 GB RAM, modern GPU, SSD"
    },
    updates: ["Director's cut endings", "Controller hints improved"],
    reviews: [
      { author: "Ada", text: "This one earns the big-screen treatment.", rating: 5 },
      { author: "Voss", text: "Huge atmosphere and sharp writing.", rating: 5 }
    ],
    screenshots: ["Throne room", "Burning gate", "Crown close-up"],
    featured: false,
    owned: false,
    installed: false,
    wishlist: true,
    demo: true,
    art:
      "linear-gradient(135deg, rgba(255,92,92,0.9), rgba(18,20,27,0.78) 40%, rgba(255,157,46,0.44))"
  },
  {
    id: 7,
    title: "Void Garden",
    slug: "void-garden",
    developer: "Glass Soil",
    genre: "Relaxing Sim",
    price: 9.99,
    rating: 4.3,
    reviewCount: 333,
    platforms: ["Windows", "Web"],
    tags: ["Chill", "Crafting", "Indie"],
    description:
      "Grow luminous plants inside a drifting greenhouse and shape the rules of the tiny universe.",
    requirements: {
      minimum: "4 GB RAM, 3 GB storage",
      recommended: "8 GB RAM"
    },
    updates: ["New photo filters", "Garden soundtrack expansion"],
    reviews: [
      { author: "Sora", text: "Soft, meditative, and surprisingly deep.", rating: 4.5 },
      { author: "June", text: "The art direction is gorgeous.", rating: 4 }
    ],
    screenshots: ["Glass dome", "Seed menu", "Bloom field"],
    featured: false,
    owned: false,
    installed: false,
    wishlist: false,
    demo: true,
    art:
      "linear-gradient(135deg, rgba(61,224,195,0.48), rgba(18,20,27,0.8) 42%, rgba(255,255,255,0.32))"
  },
  {
    id: 8,
    title: "Arcade Vanta",
    slug: "arcade-vanta",
    developer: "Signal Kid",
    genre: "Arcade",
    price: 5.0,
    rating: 4.4,
    reviewCount: 1189,
    platforms: ["Windows", "Linux", "Web"],
    tags: ["Score Attack", "Retro", "Free Trial"],
    description:
      "A blisteringly fast score chase through a monochrome arcade that learns your habits.",
    requirements: {
      minimum: "2 GB RAM, any modern GPU, 1 GB storage",
      recommended: "4 GB RAM"
    },
    updates: ["Daily challenge board", "New synth pack"],
    reviews: [
      { author: "Moss", text: "Small, bright, and addictive.", rating: 4.5 },
      { author: "Quin", text: "Exactly the kind of arcade loop I wanted.", rating: 4 }
    ],
    screenshots: ["High score table", "Light trails", "Endless mode"],
    featured: false,
    owned: true,
    installed: true,
    wishlist: false,
    demo: true,
    art:
      "linear-gradient(135deg, rgba(255,255,255,0.3), rgba(18,20,27,0.85) 48%, rgba(61,224,195,0.5))"
  }
];

export const sections = {
  trending: [1, 2, 6, 8],
  newReleases: [4, 6, 7, 8],
  topFree: [1, 5, 8],
  indie: [1, 3, 7],
  recommended: [2, 5, 6, 8]
};

export const notificationsSeed = [
  {
    id: 1,
    type: "Update",
    title: "Night Market patch 1.2.4 is live",
    detail: "Save stability and vendor balancing improvements.",
    time: "5m ago",
    unread: true
  },
  {
    id: 2,
    type: "Purchase",
    title: "Ember Crown preorder unlocked",
    detail: "Your receipt and download will appear after checkout.",
    time: "1h ago",
    unread: true
  },
  {
    id: 3,
    type: "Community",
    title: "A thread replied to your review",
    detail: "Someone quoted your Rift Runners loadout breakdown.",
    time: "3h ago",
    unread: false
  },
  {
    id: 4,
    type: "Library",
    title: "Cloud save synced",
    detail: "Your Moon Ledger state finished uploading.",
    time: "6h ago",
    unread: false
  }
];

export const communityThreads = [
  {
    id: 1,
    title: "Best hidden indie gems in LazPlay?",
    author: "Synthfox",
    replies: 18,
    likes: 43,
    category: "Discussions"
  },
  {
    id: 2,
    title: "What should a developer dashboard expose first?",
    author: "OrbitForge",
    replies: 7,
    likes: 21,
    category: "Forums"
  },
  {
    id: 3,
    title: "Showcase your favorite launch art",
    author: "PaperAnchor",
    replies: 31,
    likes: 64,
    category: "Comments"
  }
];

export const developerGames = [
  { id: 1, title: "Night Market", downloads: 18240, revenue: "$0", version: "1.2.4" },
  { id: 2, title: "Rift Runners", downloads: 12104, revenue: "$19,430", version: "2.0.1" },
  { id: 3, title: "Moon Ledger", downloads: 34011, revenue: "$0", version: "1.8.0" }
];

export function getGameById(gameId) {
  return gameCatalog.find((game) => game.id === Number(gameId)) || null;
}

export function getSectionGames(ids) {
  return ids.map((id) => getGameById(id)).filter(Boolean);
}