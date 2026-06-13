require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const http         = require('http');
const db           = require('./config/database');

const app    = express();
const server = http.createServer(app);

// Behind a single reverse proxy (Docker/nginx): trust the first hop so that
// req.ip reflects the real client (otherwise rate-limiting buckets collapse
// onto the proxy IP). Adjust the hop count to your infrastructure.
app.set('trust proxy', 1);

// ── Security middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      // Allow inline event-handler attributes (onclick="...") used across
      // the frontend. Without this, helmet's default `script-src-attr 'none'`
      // blocks every inline handler (logout, search, tabs, language toggle…).
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com", "cdn.jsdelivr.net"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      // Same-origin uploads ('self'), inline previews (data:/blob:) and
      // external ad images over TLS (https:). Plaintext-http image sources are
      // disallowed to remove a trivial exfiltration channel.
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// ── Request encoding for Arabic / UTF-8 (API responses only) ─
// Scoped to /api so it doesn't override the MIME type of static
// frontend assets (HTML/CSS/JS), which would otherwise be served
// as application/json and rejected by the browser.
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500');
}

app.use(cors({
  // Fail closed: only requests with no Origin (same-origin / server-to-server)
  // or an explicitly allow-listed Origin pass — in every environment. The dev
  // origins above are added to the allow-list only when NODE_ENV !== production.
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  },
  credentials: false,
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '5mb' }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use('/api', limiter);

// ── Static files (uploaded media) ───────────────────────────
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Admin pages ──────────────────────────────────────────────
// No server-side page guard here: a browser navigation never carries
// the `Authorization: Bearer` header (the JWT lives in localStorage and
// is only attached by fetch()), so a header-based guard would block the
// legitimate admin too. The real security boundary is the API — every
// /api/admin/* route enforces `authenticate + requireRole('admin')`.
// admin.html also performs a client-side role check for UX.

// ── Serve frontend static files ─────────────────────────────
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/categories',    require('./routes/categories'));
app.use('/api/listings',      require('./routes/listings'));
app.use('/api/media',         require('./routes/media'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/favorites',     require('./routes/favorites'));
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/advertisements',require('./routes/advertisements'));
app.use('/api/exa',           require('./routes/exa-example'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ── WebSocket — real-time chat ───────────────────────────────
// Clients are receive-only; notifications are emitted by the REST message
// routes via realtime.notifyUser (see services/realtime.js).
require('./services/realtime').initWebSocket(server);

// ── Root redirect ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── 404 fallback ─────────────────────────────────────────────
app.use((req, res) => {
  // Pour les routes non-API, essayer de servir index.html (SPA fallback)
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  } else {
    res.status(404).json({ error: 'Route introuvable.' });
  }
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀  Pro Market Algérie API`);
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log(`   WebSocket  on ws://localhost:${PORT}/ws`);
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌  Port ${PORT} is already in use.`);
    console.error(`   Please stop the other process or set a different PORT in .env`);
    process.exit(1);
  } else {
    console.error('❌  Server error:', err);
    process.exit(1);
  }
});
