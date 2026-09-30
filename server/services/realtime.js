/*
 * Live updates over Server-Sent Events. Each signed-in browser tab keeps one
 * connection open; the API pushes appointment and slot changes down it so
 * patients, doctors and admins see changes without refreshing.
 */

const HEARTBEAT_MS = 25000;
const clients = new Set();
let nextId = 1;

function write(client, event, data) {
  client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function subscribe(req, res, user) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    // no-transform stops compression proxies (like the CRA dev server) from buffering the stream.
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');

  const client = { id: nextId, userId: String(user._id), role: user.role, res };
  nextId += 1;
  clients.add(client);
  write(client, 'ready', { connectedAt: new Date().toISOString() });

  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), HEARTBEAT_MS);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
}

/**
 * Send an event to specific users, to everyone with a role, or to all connections.
 * Only the minimum data a recipient is already allowed to see should go in `data`.
 */
function publish({ userIds = [], roles = [], everyone = false }, event, data) {
  const targets = new Set(userIds.filter(Boolean).map(String));
  clients.forEach((client) => {
    if (everyone || targets.has(client.userId) || roles.includes(client.role)) {
      write(client, event, data);
    }
  });
}

function closeAll() {
  clients.forEach((client) => client.res.end());
  clients.clear();
}

function connectionCount() {
  return clients.size;
}

module.exports = { subscribe, publish, closeAll, connectionCount };
