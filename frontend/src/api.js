// ─── LazPlay API Client ──────────────────────────────────────────────────────
// Single module for all backend communication.
// Usage: import api from './api';

const BASE = import.meta.env.VITE_API_URL || 'https://play.lazplay.tech/api/v1';

function getToken() {
  return localStorage.getItem('accessToken');
}

function setTokens(access, refresh) {
  if (access) localStorage.setItem('accessToken', access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

let isRefreshing = false;

async function request(method, path, body, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.headers) Object.assign(headers, options.headers);

  let res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 401 Unauthorized - Try to refresh token
    if (res.status === 401 && !options._retry && !isRefreshing) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && path !== '/auth/refresh') {
        isRefreshing = true;
        try {
          // Attempt refresh
          const refreshRes = await fetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
            
            // Retry original request
            isRefreshing = false;
            return request(method, path, body, { ...options, _retry: true });
          }
        } catch (err) {
          console.error('Token refresh failed', err);
        } finally {
          isRefreshing = false;
        }
      }

      // If refresh failed or was not possible
      clearTokens();
      const here = window.location.pathname;
      if (here !== '/login' && here !== '/signup') {
        window.location.href = '/login';
      }
    }

    const err = new Error(data?.error?.message || `HTTP ${res.status}`);
    err.code = data?.error?.code || 'UNKNOWN';
    err.status = res.status;
    err.details = data?.error?.details;
    throw err;
  }
  return data;
}

const get = (path, params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request('GET', path + qs);
};
const post = (path, body) => request('POST', path, body);
const patch = (path, body) => request('PATCH', path, body);
const del = (path, body) => request('DELETE', path, body);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (body) => post('/auth/register', body),
  login: async (body) => {
    const data = await post('/auth/login', body);
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data;
  },
  refresh: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const data = await post('/auth/refresh', { refreshToken });
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data;
  },
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const data = await post('/auth/logout', { refreshToken });
    clearTokens();
    return data;
  },
  me: () => get('/auth/me'),
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (body) => post('/auth/reset-password', body),
};

// ─── User ─────────────────────────────────────────────────────────────────────
export const user = {
  updateProfile: (body) => patch('/users/me', body),
  changePassword: (body) => patch('/users/me/password', body),
};

// ─── Games (Public) ───────────────────────────────────────────────────────────
export const games = {
  list: (params) => get('/games', params),
  featured: (params) => get('/games/featured', params),
  get: (gameId) => get(`/games/${gameId}`),
  media: (gameId) => get(`/games/${gameId}/media`),
  reviews: (gameId, params) => get(`/games/${gameId}/reviews`, params),
  submitReview: (gameId, body) => post(`/games/${gameId}/reviews`, body),
  deleteReview: (gameId, reviewId) => del(`/games/${gameId}/reviews/${reviewId}`),
  playStart: (gameId) => post(`/games/${gameId}/plays/start`),
  playEnd: (gameId, body) => post(`/games/${gameId}/plays/end`, body),
  launchManifest: (gameId) => get(`/games/${gameId}/launch-manifest`),
  genres: () => get('/genres'),
  tags: () => get('/tags'),
  search: (params) => get('/search', params),
};

// ─── Library & Wishlist ───────────────────────────────────────────────────────
export const library = {
  list: (params) => get('/library', params),
  get: (gameId) => get(`/library/${gameId}`),
  addFavorite: (gameId) => post(`/library/${gameId}/favorite`),
  removeFavorite: (gameId) => del(`/library/${gameId}/favorite`),
};

export const wishlist = {
  list: () => get('/wishlist'),
  add: (gameId) => post(`/wishlist/${gameId}`),
  remove: (gameId) => del(`/wishlist/${gameId}`),
};

export const entitlements = {
  list: () => get('/entitlements'),
};

// ─── Payments & Orders ────────────────────────────────────────────────────────
export const payments = {
  createOrder: (body) => post('/payments/razorpay/orders', body),
  verifyPayment: (body) => post('/payments/razorpay/verify', body),
  listOrders: () => get('/orders'),
  getOrder: (orderId) => get(`/orders/${orderId}`),
  getInvoice: (invoiceId) => get(`/invoices/${invoiceId}`),
  requestRefund: (body) => post('/refunds', body),
};

// ─── Storage ──────────────────────────────────────────────────────────────────
export const storage = {
  presignUpload: (body) => post('/storage/presign-upload', body),
  presignMultipart: (body) => post('/storage/presign-multipart', body),
  completeMultipart: (body) => post('/storage/complete-multipart', body),
  presignDownload: (objectKey) => get('/storage/presign-download', { objectKey }),
};

// ─── Developer ────────────────────────────────────────────────────────────────
export const developer = {
  register: (body) => post('/developer/register', body),
  getProfile: () => get('/developer/profile'),
  updateProfile: (body) => patch('/developer/profile', body),
  dashboard: () => get('/developer/dashboard'),
  getAnalytics: (params) => get('/developer/analytics', params),

  // Games
  listGames: (params) => get('/developer/games', params),
  getGame: (gameId) => get(`/developer/games/${gameId}`),
  createGame: (body) => post('/developer/games', body),
  updateGame: (gameId, body) => patch(`/developer/games/${gameId}`, body),
  deleteGame: (gameId) => del(`/developer/games/${gameId}`),
  submitGame: (gameId) => post(`/developer/games/${gameId}/submit`),
  publishGame: (gameId) => post(`/developer/games/${gameId}/publish`),
  unpublishGame: (gameId) => post(`/developer/games/${gameId}/unpublish`),
  addMedia: (gameId, body) => post(`/developer/games/${gameId}/media`, body),
  deleteMedia: (gameId, mediaId) => del(`/developer/games/${gameId}/media/${mediaId}`),

  // Builds
  listBuilds: (params) => get('/developer/builds', params),
  listGameBuilds: (gameId) => get(`/developer/games/${gameId}/builds`),
  createBuild: (gameId, body) => post(`/developer/games/${gameId}/builds`, body),
  getBuild: (buildId) => get(`/developer/builds/${buildId}`),
  deleteBuild: (buildId) => del(`/developer/builds/${buildId}`),
  getBuildUploadUrl: (buildId, body) => post(`/developer/builds/${buildId}/upload-url`, body),
  completeBuildUpload: (buildId, body) => post(`/developer/builds/${buildId}/uploads/complete`, body),
  scanBuild: (buildId) => post(`/developer/builds/${buildId}/scan`),
  deployBuild: (buildId, body) => post(`/developer/builds/${buildId}/deploy`, body),
  makeLatestBuild: (buildId) => post(`/developer/builds/${buildId}/make-latest`),

  // Deployments
  listDeployments: (params) => get('/developer/deployments', params),
  getDeployment: (deploymentId) => get(`/developer/deployments/${deploymentId}`),
  getDeploymentLogs: (deploymentId, params) => get(`/developer/deployments/${deploymentId}/logs`, params),
};

// ─── Instances ────────────────────────────────────────────────────────────────
export const instances = {
  create: (body) => post('/instances', body),
  list: (params) => get('/instances', params),
  get: (instanceId) => get(`/instances/${instanceId}`),
  start: (instanceId) => post(`/instances/${instanceId}/start`),
  stop: (instanceId) => post(`/instances/${instanceId}/stop`),
  restart: (instanceId) => post(`/instances/${instanceId}/restart`),
  delete: (instanceId) => del(`/instances/${instanceId}`),
  getLogs: (instanceId) => get(`/instances/${instanceId}/logs`),
  getMetrics: (instanceId) => get(`/instances/${instanceId}/metrics`),
  join: (instanceId, body) => post(`/instances/${instanceId}/join`, body),
  getConnectToken: (instanceId) => get(`/instances/${instanceId}/connect-token`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const admin = {
  dashboard: () => get('/admin/analytics'),

  // Users
  listUsers: (params) => get('/admin/users', params),
  getUser: (userId) => get(`/admin/users/${userId}`),
  updateUserRole: (userId, roles) => patch(`/admin/users/${userId}/role`, { roles }),
  updateUserStatus: (userId, status) => patch(`/admin/users/${userId}/status`, { status }),
  banUser: (userId, body) => post(`/admin/users/${userId}/ban`, body),
  unbanUser: (userId) => post(`/admin/users/${userId}/unban`),

  // Games
  listGames: (params) => get('/admin/games', params),
  getGame: (gameId) => get(`/admin/games/${gameId}`),
  updateGameStatus: (gameId, body) => patch(`/admin/games/${gameId}/status`, body),
  featureGame: (gameId) => post(`/admin/games/${gameId}/feature`),
  unfeatureGame: (gameId) => del(`/admin/games/${gameId}/feature`),

  // Deployments
  listDeployments: (params) => get('/admin/deployments', params),
  getDeployment: (deploymentId) => get(`/admin/deployments/${deploymentId}`),

  // Servers
  listServers: () => get('/admin/nodes'),
  addServer: (body) => post('/admin/servers', body),
  updateServer: (nodeId, body) => patch(`/admin/servers/${nodeId}`, body),
  removeServer: (nodeId) => del(`/admin/servers/${nodeId}`),

  // Instances
  listInstances: (params) => get('/admin/instances', params),
  deleteInstance: (instanceId) => del(`/admin/instances/${instanceId}`),

  // Payments & Refunds
  listPayments: (params) => get('/admin/payments', params),
  getPayment: (paymentId) => get(`/admin/payments/${paymentId}`),
  listRefunds: () => get('/admin/refunds'),
  getRefund: (refundId) => get(`/admin/refunds/${refundId}`),
  updateRefund: (refundId, body) => patch(`/admin/refunds/${refundId}`, body),

  // Audit & Reports
  getAuditLogs: (params) => get('/admin/audit-logs', params),
  getReports: (params) => get('/admin/reports', params),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = {
  list: (params) => get('/notifications', params),
  markRead: (notificationId) => post(`/notifications/${notificationId}/read`),
  markAllRead: () => post('/notifications/read-all'),
};

// ─── System ───────────────────────────────────────────────────────────────────
export const system = {
  health: () => get('/health'),
  version: () => get('/version'),
};

export default {
  auth, user, games, library, wishlist, entitlements,
  payments, storage, developer, instances, admin,
  notifications, system,
};
