require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const http         = require('http');
const WebSocket    = require('ws');
const db           = require('./config/database');

const app    = express();
const server = http.createServer(app);

// ── Security middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com", "cdn.jsdelivr.net"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// ── Request encoding for Arabic / UTF-8 ─────────────────────
app.use((req, res, next) => {
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
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
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
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  validate: { trustProxy: false },
});
app.use('/api', limiter);

// ── Static files (uploaded media) ───────────────────────────
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Protect admin pages ─────────────────────────────────────
const ADMIN_PAGES = ['/pages/admin.html', '/pages/admin-publish.html'];
const jwt = require('jsonwebtoken');

app.use((req, res, next) => {
  const isAdminPage = ADMIN_PAGES.some(p => req.path.endsWith(p));
  if (!isAdminPage) return next();

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>Accès refusé</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px">
        <h1>403 — Accès refusé</h1>
        <p>Vous devez être connecté en tant qu'administrateur pour accéder à cette page.</p>
        <a href="/pages/login.html">Se connecter</a>
      </body></html>
    `);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>Accès refusé</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px">
          <h1>403 — Accès refusé</h1>
          <p>Vous n'avez pas les droits administrateur.</p>
          <a href="/">Retour à l'accueil</a>
        </body></html>
      `);
    }
    next();
  } catch {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>Session invalide</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px">
        <h1>403 — Session invalide</h1>
        <p>Votre session a expiré. Veuillez vous reconnecter.</p>
        <a href="/pages/login.html">Se connecter</a>
      </body></html>
    `);
  }
});

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
const wss = new WebSocket.Server({ server, path: '/ws' });
const clients = new Map(); // userId → ws

wss.on('error', (err) => {
  console.error('WebSocket server error:', err.message);
});

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url.replace('/ws?', ''));
  const token = params.get('token');
  let userId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch {
      ws.close(1008, 'Invalid token');
      return;
    }
  }

  if (userId) clients.set(userId, ws);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      // Broadcast to recipient if connected
      if (msg.type === 'new_message' && msg.recipient_id) {
        const recipientWs = clients.get(msg.recipient_id);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify(msg));
        }
      }
    } catch {
      // Ignore malformed WebSocket messages
    }
  });

  ws.on('close', () => {
    if (userId) clients.delete(userId);
  });
});

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
