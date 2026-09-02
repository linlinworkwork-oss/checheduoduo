require('dotenv').config();

const { connect } = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pinche';
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  await connect(MONGODB_URI);
  const app = createApp({
    corsOrigins,
    serveWeb: process.env.SERVE_WEB !== 'false',
  });
  app.listen(PORT, () => {
    console.log(`[server] pinche API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
