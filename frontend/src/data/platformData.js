export const featuredGameId = null;

export const gameCatalog = [];

export const sections = {
  trending: [],
  newReleases: [],
  topFree: [],
  indie: [],
  recommended: []
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

export const developerGames = [];

export function getGameById(gameId) {
  return gameCatalog.find((game) => game.id === Number(gameId)) || null;
}

export function getSectionGames(ids) {
  return ids.map((id) => getGameById(id)).filter(Boolean);
}
