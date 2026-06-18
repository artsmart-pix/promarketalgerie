/* ============================================================
   PRO MARKET ALGÉRIE — API Client
   Central module for all HTTP calls to the backend.
   ============================================================ */

// Auto-detect API base URL
const API_BASE = (() => {
  if (typeof window === 'undefined') return 'http://localhost:3001/api';
  // Opened directly from disk (file://) — talk to a local dev backend.
  if (window.location.protocol === 'file:') return 'http://localhost:3001/api';
  // Served over http(s) by the backend (dev on :3001) or behind a reverse
  // proxy in production (Caddy → app) — the API lives on the same origin.
  return '/api';
})();

// ── Token management ─────────────────────────────────────────
const Auth = {
  getToken:    ()       => localStorage.getItem('pm_token'),
  setToken:    (t)      => localStorage.setItem('pm_token', t),
  removeToken: ()       => localStorage.removeItem('pm_token'),
  getUser:     ()       => { try { return JSON.parse(localStorage.getItem('pm_user')); } catch { return null; } },
  setUser:     (u)      => localStorage.setItem('pm_user', JSON.stringify(u)),
  removeUser:  ()       => localStorage.removeItem('pm_user'),
  isLoggedIn:  ()       => !!localStorage.getItem('pm_token'),
  logout: () => {
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    const base = location.pathname.includes('/pages/') ? '../' : '';
    window.location.href = base + 'pages/login.html';
  },
};

// ── Base fetch wrapper ────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, signal: controller.signal });
  clearTimeout(timeoutId);

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    const onLoginPage = location.pathname.includes('login.html');
    if (!onLoginPage) {
      setTimeout(() => Auth.logout(), 100);
    }
    throw { status: 401, error: 'Session expirée. Veuillez vous reconnecter.' };
  }

  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

async function apiFormData(endpoint, formData, method = 'POST') {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const res = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: formData, signal: controller.signal });
  clearTimeout(timeoutId);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

// ── AUTH ──────────────────────────────────────────────────────
const AuthAPI = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:       ()     => apiFetch('/auth/me'),
  updateProfile: (body) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  forgotPassword: (email)          => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword:  (token, password) => apiFetch('/auth/reset-password',  { method: 'POST', body: JSON.stringify({ token, password }) }),
};

// ── CATEGORIES ────────────────────────────────────────────────
const CategoriesAPI = {
  list:    () => apiFetch('/categories'),
  get:     (slug) => apiFetch(`/categories/${slug}`),
  wilayas: () => apiFetch('/categories/geo/wilayas'),
  communes: (wilayaId) => apiFetch(`/categories/geo/wilayas/${wilayaId}/communes`),
};

// ── LISTINGS ──────────────────────────────────────────────────
const ListingsAPI = {
  search:  (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v != null)));
    return apiFetch(`/listings?${qs}`);
  },
  carousel: () => apiFetch('/listings/carousel'),
  get:      (id)   => apiFetch(`/listings/${id}`),
  mine:     ()     => apiFetch('/listings/user/mine'),
  create:   (body) => apiFetch('/listings', { method: 'POST', body: JSON.stringify(body) }),
  update:   (id, body) => apiFetch(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete:   (id)   => apiFetch(`/listings/${id}`, { method: 'DELETE' }),
  revealPhone: (id) => apiFetch(`/listings/${id}/reveal-phone`, { method: 'POST' }),
};

// ── MEDIA ─────────────────────────────────────────────────────
const MediaAPI = {
  upload:       (listingId, formData) => apiFormData(`/media/listings/${listingId}`, formData),
  uploadLogo:   (formData)            => apiFormData('/media/profile', formData),
  deleteMedia:  (mediaId)             => apiFetch(`/media/${mediaId}`, { method: 'DELETE' }),
};

// ── FAVORITES ─────────────────────────────────────────────────
const FavoritesAPI = {
  list:   ()         => apiFetch('/favorites'),
  add:    (id)       => apiFetch(`/favorites/${id}`, { method: 'POST' }),
  remove: (id)       => apiFetch(`/favorites/${id}`, { method: 'DELETE' }),
  check:  (id)       => apiFetch(`/favorites/check/${id}`),
};


// ── MESSAGES ─────────────────────────────────────────────────
const MessagesAPI = {
  conversations: ()       => apiFetch('/messages/conversations'),
  thread:        (id)     => apiFetch(`/messages/conversations/${id}`),
  start:         (body)   => apiFetch('/messages/start', { method: 'POST', body: JSON.stringify(body) }),
  send:          (id, formData) => apiFormData(`/messages/conversations/${id}/send`, formData),
};

// ── SUBSCRIPTIONS ─────────────────────────────────────────────
const SubscriptionsAPI = {
  packs:     () => apiFetch('/subscriptions/packs'),
  boosts:    () => apiFetch('/subscriptions/boosts'),
  order:     (formData) => apiFormData('/subscriptions/order', formData),
  boost:     (body)     => apiFetch('/subscriptions/boost', { method: 'POST', body: JSON.stringify(body) }),
  myOrders:  ()         => apiFetch('/subscriptions/my-orders'),
};

// ── ADVERTISEMENTS ────────────────────────────────────────────
const AdsAPI = {
  list:     (position = 'homepage') => apiFetch(`/advertisements?position=${position}`),
  adminList:() => apiFetch('/advertisements/admin'),
  create:   (body) => apiFetch('/advertisements', { method: 'POST', body: JSON.stringify(body) }),
  update:   (id, body) => apiFetch(`/advertisements/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete:   (id) => apiFetch(`/advertisements/${id}`, { method: 'DELETE' }),
  toggle:   (id) => apiFetch(`/advertisements/${id}/toggle`, { method: 'PATCH' }),
  click:    (id) => apiFetch(`/advertisements/${id}/click`, { method: 'POST' }),
};

// ── ADMIN ─────────────────────────────────────────────────────
const AdminAPI = {
  stats:          ()       => apiFetch('/admin/stats'),
  pendingListings:()       => apiFetch('/admin/listings/pending'),
  approve:        (id)     => apiFetch(`/admin/listings/${id}/approve`, { method: 'PATCH' }),
  reject:         (id, reason) => apiFetch(`/admin/listings/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  activate:       (id, fee)    => apiFetch(`/admin/listings/${id}/activate`, { method: 'PATCH', body: JSON.stringify({ fee }) }),
  markSold:       (id)         => apiFetch(`/admin/listings/${id}/mark-sold`, { method: 'PATCH' }),
  activeListings: ()           => apiFetch('/admin/listings/active'),
  getListing:     (id)         => apiFetch(`/admin/listings/${id}`),
  updateListing:  (id, body)   => apiFetch(`/admin/listings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  reorderMedia:   (id, order)  => apiFetch(`/admin/listings/${id}/media-order`, { method: 'PATCH', body: JSON.stringify({ order }) }),
  boostListing:   (id, body)   => apiFetch(`/admin/listings/${id}/boost`, { method: 'PATCH', body: JSON.stringify(body) }),
  users:          (params = {}) => {
    const qs = new URLSearchParams(params);
    return apiFetch(`/admin/users?${qs}`);
  },
  certifyUser:    (id)     => apiFetch(`/admin/users/${id}/certify`, { method: 'PATCH' }),
  toggleUser:     (id)     => apiFetch(`/admin/users/${id}/toggle-active`, { method: 'PATCH' }),
  setPack:        (id, body)   => apiFetch(`/admin/users/${id}/set-pack`, { method: 'PATCH', body: JSON.stringify(body) }),
  pendingOrders:  ()       => apiFetch('/admin/orders'),
  validateOrder:  (id)     => apiFetch(`/admin/orders/${id}/validate`, { method: 'PATCH' }),
  createListing:  (body)   => apiFetch('/admin/listings/create', { method: 'POST', body: JSON.stringify(body) }),
};

// ── WebSocket client ──────────────────────────────────────────
let _wsReconnectTimer = null;
let _activeWS = null;

function clearWSReconnect() {
  if (_wsReconnectTimer) {
    clearTimeout(_wsReconnectTimer);
    _wsReconnectTimer = null;
  }
}

function createWSClient(onMessage) {
  const userId = Auth.getUser()?.id;
  const token = Auth.getToken();
  if (!userId || !token) return null;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Same host as the page (dev :3001 or prod domain behind Caddy); only a
  // file:// page needs to point at an explicit local backend.
  const wsHost = window.location.protocol === 'file:' ? 'localhost:3001' : window.location.host;
  const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws?token=${token}`);
  _activeWS = ws;

  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  ws.onclose = () => {
    _activeWS = null;
    // Reconnect after 3s
    _wsReconnectTimer = setTimeout(() => createWSClient(onMessage), 3000);
  };
  return ws;
}

window.API_BASE = API_BASE;
window.Auth = Auth;
window.AuthAPI = AuthAPI;
window.CategoriesAPI = CategoriesAPI;
window.ListingsAPI = ListingsAPI;
window.MediaAPI = MediaAPI;
window.FavoritesAPI = FavoritesAPI;
window.MessagesAPI = MessagesAPI;
window.SubscriptionsAPI = SubscriptionsAPI;
window.AdminAPI = AdminAPI;
window.AdsAPI = AdsAPI;
window.createWSClient = createWSClient;
window.clearWSReconnect = clearWSReconnect;
