const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const { requireUid } = require('./middleware/auth');
const { fail } = require('./utils/response');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const tripsRoutes = require('./routes/trips');
const myTripsRoutes = require('./routes/myTrips');

/**
 * 组装 Express App。
 * @param {object} options { corsOrigins: string[] }
 */
function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // CORS：开发期跨端口（Taro dev server ↔ API）；生产同域托管时请求同源不命中
  const corsOrigins = options.corsOrigins || [];
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || corsOrigins.length === 0) return cb(null, true); // 同源/未配置则放行
        if (corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
    }),
  );

  // 健康检查
  app.get('/api/health', (req, res) => res.json({ code: 0, status: 'ok' }));

  // 业务路由：GET /api/auth（login）与其余全部走 requireUid（x-uid 头）
  app.use('/api/auth', requireUid, authRoutes);
  app.use('/api/profile', requireUid, profileRoutes);
  app.use('/api/trips', requireUid, tripsRoutes);
  app.use('/api/my-trips', requireUid, myTripsRoutes);

  // 404 for unknown api
  app.use('/api', (req, res) => fail(res, 404, '接口不存在'));

  // 托管前端静态文件（生产同域部署）
  // 查找顺序：1) 显式指定 WEB_DIR；2) server/web（部署时拷贝进服务目录）；
  //          3) 仓库根 web/（本地联调，dev-server 用）
  const candidateDirs = [
    options.webDir,
    path.resolve(__dirname, '../web'),
    path.resolve(__dirname, '../../web'),
  ].filter(Boolean);
  const webDir = candidateDirs.find((d) => fs.existsSync(d));
  if (options.serveWeb !== false && webDir) {
    app.use(express.static(webDir));
    // hash 路由不需要 history fallback；首页兜底
    app.get('/', (req, res) => res.sendFile(path.join(webDir, 'index.html')));
  }

  // 统一错误处理
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[server] Unhandled error:', err);
    if (res.headersSent) return next(err);
    return fail(res, 500, '服务器内部错误');
  });

  return app;
}

module.exports = { createApp };
