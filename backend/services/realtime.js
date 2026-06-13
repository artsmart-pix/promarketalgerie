/**
 * Real-time messaging over WebSocket.
 *
 * Design: clients only *receive*. They never drive broadcasts — that was a
 * spoofing vector (any socket could push a payload to any user). Notifications
 * are emitted server-side by the REST routes (after persistence + authorization)
 * via `notifyUser`.
 */
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// userId → Set<ws> (a user may be connected from several tabs/devices)
const clients = new Map();

function addClient(userId, ws) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(ws);
}

function removeClient(userId, ws) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clients.delete(userId);
}

/** Push a JSON payload to every live socket of a given user. */
function notifyUser(userId, payload) {
  const set = clients.get(userId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function initWebSocket(server) {
  // Authenticate during the HTTP upgrade handshake — anonymous or invalid-token
  // sockets are rejected before the WebSocket is ever established.
  const wss = new WebSocket.Server({
    server,
    path: '/ws',
    verifyClient: (info, cb) => {
      const params = new URLSearchParams((info.req.url || '').replace('/ws?', ''));
      try {
        info.req.userId = jwt.verify(params.get('token'), process.env.JWT_SECRET).userId;
        cb(true);
      } catch {
        cb(false, 401, 'Unauthorized');
      }
    },
  });

  wss.on('error', (err) => console.error('WebSocket server error:', err.message));

  wss.on('connection', (ws, req) => {
    const userId = req.userId;

    addClient(userId, ws);

    // Heartbeat to drop dead connections.
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Clients are receive-only; ignore any inbound payloads.
    ws.on('message', () => {});
    ws.on('close', () => removeClient(userId, ws));
  });

  const heartbeat = setInterval(() => {
    for (const set of clients.values()) {
      for (const ws of set) {
        if (ws.isAlive === false) { ws.terminate(); continue; }
        ws.isAlive = false;
        ws.ping();
      }
    }
  }, 30000);
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

module.exports = { initWebSocket, notifyUser };
