import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join } from 'node:path';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolveDbPath = () => {
  const customPath = process.env.CHAT_DB_PATH;

  if (!customPath) {
    return join(__dirname, 'chat.db');
  }

  return isAbsolute(customPath) ? customPath : join(__dirname, customPath);
};

const dbFilePath = resolveDbPath();

const db = await open({
  filename: dbFilePath,
  driver: sqlite3.Database
});

await db.exec('PRAGMA journal_mode = WAL;');
await db.exec('PRAGMA busy_timeout = 5000;');

await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_offset TEXT UNIQUE,
    content TEXT
  );
`);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});

const DEFAULT_MAX_MESSAGE_LENGTH = 500;
const rawMaxMessageLength = process.env.MAX_MESSAGE_LENGTH;
const hasCustomMaxMessageLength =
  rawMaxMessageLength !== undefined &&
  rawMaxMessageLength !== null &&
  String(rawMaxMessageLength).trim() !== '';

const MAX_MESSAGE_LENGTH = (() => {
  if (!hasCustomMaxMessageLength) {
    return DEFAULT_MAX_MESSAGE_LENGTH;
  }

  const numericValue = Number(rawMaxMessageLength);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    console.error(
      `Invalid MAX_MESSAGE_LENGTH value "${rawMaxMessageLength}". Expected a positive integer.`
    );
    process.exit(1);
  }

  return numericValue;
})();

app.use(express.static(__dirname));

app.get('/config.js', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('application/javascript');
  res.send(
    `window.__APP_CONFIG__ = Object.freeze({ maxMessageLength: ${MAX_MESSAGE_LENGTH} });`
  );
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', async (socket) => {
  socket.on('chat message', async (msg, clientOffset, callback) => {
    const ack =
      typeof callback === 'function'
        ? callback
        : () => {};

    if (typeof msg !== 'string') {
      ack({
        ok: false,
        error: 'INVALID_MESSAGE_TYPE'
      });
      return;
    }

    if (msg.length > MAX_MESSAGE_LENGTH) {
      ack({
        ok: false,
        error: 'MESSAGE_TOO_LONG',
        limit: MAX_MESSAGE_LENGTH
      });
      return;
    }

    try {
      const result = await db.run(
        'INSERT INTO messages (content, client_offset) VALUES (?, ?)',
        msg,
        clientOffset
      );

      const payload = {
        id: result.lastID,
        content: msg
      };

      io.emit('chat message', payload);
      ack({ ok: true, serverOffset: result.lastID });
    } catch (e) {
      if (e.errno === 19 /* SQLITE_CONSTRAINT */) {
        try {
          const existing = await db.get(
            'SELECT id FROM messages WHERE client_offset = ?',
            clientOffset
          );

          if (existing) {
            ack({
              ok: true,
              duplicate: true,
              serverOffset: existing.id
            });
          } else {
            ack({
              ok: false,
              error: 'MESSAGE_EXISTS_NO_ID'
            });
          }
        } catch (lookupError) {
          console.error('Failed to fetch existing message id', lookupError);
          ack({
            ok: false,
            error: 'DUPLICATE_LOOKUP_FAILED'
          });
        }
      } else {
        console.error('Failed to persist chat message', {
          error: e,
          clientOffset
        });
        ack({
          ok: false,
          error: 'INTERNAL_ERROR'
        });
      }
    }
  });

  if (!socket.recovered) {
    const rawOffset = socket.handshake.auth?.serverOffset ?? 0;
    const serverOffset = Number(rawOffset) || 0;

    try {
      const rows = await db.all(
        `
          SELECT id, content
          FROM messages
          WHERE id > ?
          ORDER BY id ASC
          LIMIT 500
        `,
        serverOffset
      );

      for (const row of rows) {
        socket.emit('chat message', {
          id: row.id,
          content: row.content
        });
      }
    } catch (e) {
      console.error('Failed to replay missed messages', e);
    }
  }
});

const DEFAULT_PORT = 3000;
const HOST = process.env.HOST || '0.0.0.0';
const rawEnvPort = process.env.PORT;
const hasCustomPort =
  rawEnvPort !== undefined &&
  rawEnvPort !== null &&
  String(rawEnvPort).trim() !== '';

const parsePort = (value, fallback) => {
  if (!hasCustomPort) {
    return fallback;
  }

  const numericPort = Number(value);

  if (
    !Number.isInteger(numericPort) ||
    numericPort < 0 ||
    numericPort > 65535
  ) {
    console.error(
      `Invalid PORT value "${value}". Expected an integer between 0 and 65535.`
    );
    process.exit(1);
  }

  return numericPort;
};

const PORT = parsePort(rawEnvPort, DEFAULT_PORT);

const shuttingDown = {
  active: false
};

const initiateShutdown = (signal) => {
  if (shuttingDown.active) {
    return;
  }

  shuttingDown.active = true;
  console.log(`${signal} received. Gracefully shutting down...`);

  server.close(async (closeErr) => {
    if (closeErr) {
      console.error('Error while closing HTTP server', closeErr);
    }

    try {
      await db.close();
    } catch (dbErr) {
      console.error('Error while closing SQLite connection', dbErr);
    } finally {
      process.exit(closeErr ? 1 : 0);
    }
  });
};

process.on('SIGTERM', initiateShutdown);
process.on('SIGINT', initiateShutdown);

const listenOnPort = (port) => new Promise((resolve, reject) => {
  const handleError = (err) => {
    server.off('listening', handleListening);
    reject(err);
  };

  const handleListening = () => {
    server.off('error', handleError);
    resolve(server.address());
  };

  server.once('error', handleError);
  server.once('listening', handleListening);
  server.listen(port, HOST);
});

const logReadyState = (addressInfo) => {
  if (typeof addressInfo === 'string') {
    console.log(`server running at ${addressInfo}`);
    return;
  }

  const listeningHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`server running at http://${listeningHost}:${addressInfo.port}`);
};

const startServer = async () => {
  try {
    const addressInfo = await listenOnPort(PORT);
    logReadyState(addressInfo);
  } catch (err) {
    if (err.code === 'EADDRINUSE' && !hasCustomPort) {
      console.warn(
        `Port ${PORT} is already in use. Falling back to a random open port.`
      );
      const addressInfo = await listenOnPort(0);
      logReadyState(addressInfo);
      return;
    }

    console.error(`Unable to bind HTTP server to ${HOST}:${PORT}`, err);
    process.exit(1);
  }
};

await startServer();
