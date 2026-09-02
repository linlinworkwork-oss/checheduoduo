# 后端部署与联调指南（方案 B）

自建 Node.js + Express + MongoDB 后端，替代微信云函数。前端 Taro H5 通过
`src/lib/cloud.ts` 的 REST 封装调用本服务（接口语义与云函数一一对应）。

## 目录结构

```
server/
├── src/
│   ├── index.js          # 入口（读 .env → 连 Mongo → 起服务）
│   ├── app.js            # Express 装配（CORS/路由/静态托管/错误处理）
│   ├── db.js             # mongoose 连接
│   ├── models/           # User / Trip（字符串 _id，兼容云开发导出数据）
│   ├── middleware/auth.js# x-uid 请求头鉴权
│   ├── routes/           # auth / profile / trips / myTrips
│   └── utils/            # 响应格式 / 时间工具 / asyncHandler
└── scripts/
    ├── smoke-test.js     # 内存 MongoDB 全流程冒烟测试（npm run smoke）
    ├── dev-server.js     # 本地联调（内存 Mongo + 托管 web/ 静态产物）
    └── migrate.js        # 云开发导出 JSON → MongoDB 迁移（npm run migrate）
```

## API 一览（与 11 个云函数对应）

| 云函数 | REST 端点 | 说明 |
|---|---|---|
| login | `GET /api/auth` | 用 `x-uid` 查/建用户档案 |
| updateProfile | `PATCH /api/profile` | 白名单字段更新 |
| createTrip | `POST /api/trips` | 校验同云函数 |
| listTrips | `GET /api/trips` | query: date/keyword/hideFull/分页/地点数组 |
| getTrip | `GET /api/trips/:id` | 详情 |
| joinTrip | `POST /api/trips/:id/join` | body: luggageSize |
| leaveTrip | `POST /api/trips/:id/leave` | |
| cancelTrip | `POST /api/trips/:id/cancel` | 仅发起人 |
| completeTrip | `POST /api/trips/:id/complete` | completedBy push |
| getMyTrips | `GET /api/my-trips` | created/joined/completed |
| getPhoneNumber | （废弃） | 网站无微信能力，手机号手动填写 |

- 鉴权：每个请求带 `x-uid` 头（前端自动生成/持久化的匿名 uid）。
- 响应格式：成功 `{ code: 0, ... }`；失败 `{ code: 状态码, message }`（HTTP 状态码一致）。

## 本地开发联调（最快路径）

```bash
cd server
cp .env.example .env        # 默认即本地内存 Mongo，无需额外安装
npm install
npm run smoke               # 43 项冒烟测试（自动下载内存 MongoDB，仅首次较慢）
node scripts/dev-server.js  # 联调服务: http://localhost:3900
```

`dev-server.js` 用内存 MongoDB（数据重启即失），并托管项目根 `web/`（H5 构建产物）：
- 页面：http://localhost:3900 （`/` 返回 web/index.html）
- API：http://localhost:3900/api/...（同源，无跨域）

**修改前端后**需要先重新构建 H5：

```bash
# 在项目根目录
npm run build:h5     # 输出到 web/
```

### 用真实 MongoDB（数据持久）

```bash
# 安装本机 MongoDB（brew install mongodb-community）或使用 Docker：
# docker run -d -p 27017:27017 --name pinche-mongo mongo
cd server
# .env 中设置：
#   MONGODB_URI=mongodb://127.0.0.1:27017/pinche
npm run dev           # 监听 3000（或 .env PORT）
# 项目根 .env 的 TARO_APP_API_BASE=http://localhost:3000 已指向它
# 另起终端：npm run dev:h5（Taro dev server 默认 http://localhost:10086）
```

## 生产部署

### 方案一：单机同域（推荐，最简单）

一个 Node 进程同时托管前端静态文件与 API：

1. **构建前端**（项目根）：
   ```bash
   TARO_APP_API_BASE= npm run build:h5   # API_BASE 留空 → 走同源相对路径 /api
   ```
2. **配置后端**（server/.env）：
   ```
   MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/pinche
   PORT=3000
   CORS_ORIGINS=            # 同源部署，无需 CORS
   SERVE_WEB=true           # 默认即 true：托管 ../web 目录
   ```
3. **启动**：`cd server && npm start`
4. **反向代理 + HTTPS**（nginx 示例）：
   ```nginx
   server {
     listen 443 ssl;
     server_name your-domain.com;
     # ssl_certificate ...;
     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
     }
   }
   ```
   国内服务器需域名备案；或部署到海外主机（Railway/Render/Fly.io 免费层）免备案。

### 方案二：前后端分离

前端 `web/` 放任意静态托管（对象存储 CDN / Nginx / GitHub Pages），
后端单独跑在服务器，`.env`：

```
TARO_APP_API_BASE=https://api.your-domain.com
CORS_ORIGINS=https://your-domain.com
```

构建前端时把 API_BASE 指向后端域名即可。

## 数据迁移（云开发 → MongoDB）

1. 微信开发者工具 → 云开发控制台 → 数据库，导出 **users**、**trips** 集合为 JSON：
   - `server/data/users.json`
   - `server/data/trips.json`
2. 运行：
   ```bash
   cd server
   npm run migrate        # 幂等：重复运行自动跳过已导入文档
   ```
3. 迁移会：
   - 保留原字符串 `_id`（前端链接/状态不受影响）
   - 老 trips 缺 `departureEndTime` 时按**北京时间**补算绝对时间戳（时区修复）

## 环境变量速查

| 变量 | 默认 | 说明 |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/pinche` | Mongo 连接串 |
| `PORT` | `3000` | 服务端口 |
| `CORS_ORIGINS` | 空（放行同源与无 Origin） | 逗号分隔允许的来源 |
| `SERVE_WEB` | `true` | 是否托管 `../web` 静态目录 |
| 前端 `TARO_APP_API_BASE` | 空（同源 `/api`） | 构建期注入，见项目根 `.env` |

## 风险提示

- **鉴权强度**：匿名 uid（`x-uid`）可被伪造，校园互助场景可接受；后续可升级 JWT。
- **数据双写**：若小程序体验版仍在使用云开发，网站与小程序是两套独立数据；
  建议二选一（停用小程序，或保留小程序并同时把它的 `lib/cloud.ts` 指向本服务，
  但小程序 request 域名需备案且 https）。
