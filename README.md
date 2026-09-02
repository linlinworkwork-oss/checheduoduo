# 🚗 校园拼车 - Campus Carpool

基于 **Taro 4.x + React 18 + TypeScript + Zustand + SCSS** 的校园拼车应用。
因微信小程序类目限制无法个人发布，本项目以 **网站（H5）** 为主形态，
后端采用 **自建 Express + MongoDB**（方案 B），完全摆脱微信云开发依赖。

<p align="center">
  <img src="https://img.shields.io/badge/Taro-4.x-blue?logo=taro" alt="Taro">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/State-Zustand-8B5CF6" alt="Zustand">
  <img src="https://img.shields.io/badge/Backend-Express%2BMongoDB-green" alt="Backend">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

## ✨ 功能亮点

| 模块 | 功能 | 说明 |
|------|------|------|
| 🏠 **行程广场** | 浏览、筛选、搜索拼车行程 | 按日期 / 关键词检索；**已过期行程自动隐藏** |
| ✏️ **发布行程** | 创建拼车行程 | 出发时间区间、地点选择、人数、行李大小、备注 |
| 📋 **行程详情** | 查看参与者 & 加入/退出 | 参与者可见联系方式（手机/学号/微信） |
| 👤 **个人中心** | 编辑资料 & 管理行程 | 昵称、手机号、性别、学号、微信号；三组行程列表 |
| 🕐 **临出发提醒** | 出发时间临近确认 | 支持"不去了"一键退出 |

## 🏗️ 技术架构（方案 B）

```
┌─────────────────────────────────────────────────┐
│            浏览器 SPA（Taro H5，产物 web/）        │
│  Plaza / Create / Detail / Profile              │
│  └─ Zustand Store（userStore / tripStore）        │
│  └─ lib/cloud.ts（REST 封装：callCloudFunction）  │
└───────────────────┬─────────────────────────────┘
                    │ HTTP + JSON（x-uid 头鉴权）
┌───────────────────▼─────────────────────────────┐
│  server/（Node.js + Express + Mongoose）         │
│  routes: auth / profile / trips / myTrips       │
│  逻辑 = 原 11 个云函数 1:1 平移                   │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│  MongoDB（users / trips，结构与云开发一致）        │
│  字符串 _id；departureEndTime 绝对时间戳（无时区坑）│
└─────────────────────────────────────────────────┘
```

前端页面/组件/store **全部复用**：`lib/cloud.ts` 保持 `callCloudFunction(name, payload)`
签名不变，内部把"云函数名调用"映射为 REST 请求，业务代码零改动。

## 📦 技术栈

| 层 | 选型 | 说明 |
|---|------|------|
| 前端 | Taro 4.x + React 18 | 编译 H5（weapp 构建仍可用，仅参考） |
| 语言 | TypeScript 5.x | |
| 状态管理 | Zustand 4.x | |
| 样式 | SCSS + CSS Custom Properties | 设计令牌定义在 `page` 上 |
| 后端 | Node.js + Express 4 + Mongoose | `server/` 目录 |
| 数据库 | MongoDB | 本地 / Atlas M0 免费层 |

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install          # 前端
cd server && npm install   # 后端
```

### 2. 配置环境

```bash
cp .env.example .env       # 项目根：前端 API 地址
cd server && cp .env.example .env   # 后端：Mongo 连接 / 端口
```

### 3. 本地全栈联调（最快路径，无需装 MongoDB）

```bash
cd server
npm run smoke        # 43 项冒烟测试（自动下载内存 MongoDB，仅首次较慢）

# 联调服务（内存 Mongo + 托管 web/ 静态产物）：
node scripts/dev-server.js   # → http://localhost:3900
```

详细说明见 **[server/README.md](server/README.md)**。

### 4. 常规开发（真实 MongoDB）

```bash
# 后端（需本机 MongoDB 或 Docker）：
cd server && npm run dev     # http://localhost:3000

# 前端（另开终端）：
npm run dev:h5               # Taro dev server → 打开提示的地址
```

> `.env` 中 `TARO_APP_API_BASE=http://localhost:3000` 已指向本地后端。
> 后端跨域白名单见 `server/.env` 的 `CORS_ORIGINS`。

### 5. 生产构建

```bash
# 同域部署（后端托管静态文件，最简）：
TARO_APP_API_BASE= npm run build:h5     # 产物 web/，API 走同源 /api

# 分离部署（前后端不同域）：
TARO_APP_API_BASE=https://api.your-domain.com npm run build:h5
```

## 📁 项目结构

```
pinche/
├── src/                          # 前端（Taro）
│   ├── app.config.ts             # 路由 / tabBar
│   ├── app.tsx                   # 入口（初始化 uid + 拉取用户）
│   ├── components/               # trip-card / trip-row / ui/
│   ├── pages/                    # plaza / create / detail / profile
│   ├── stores/                   # userStore / tripStore
│   └── lib/
│       ├── cloud.ts              # REST 封装（callCloudFunction，自动带 x-uid）
│       ├── trip.ts               # 时间/临出发判断
│       └── date.ts               # 日期格式化
├── server/                       # 后端（Express + MongoDB）
│   ├── src/models/               # User / Trip
│   ├── src/routes/               # auth / profile / trips / myTrips
│   └── scripts/                  # smoke-test / dev-server / migrate
├── cloudfunctions/               # 【已弃用】微信云函数（方案 A 遗留，可删除）
├── config/                       # Taro 构建配置（注入 API_BASE）
├── web/                          # H5 构建产物（勿手改）
├── PLAN-B.md                     # 方案 B 设计文档
└── .env                          # TARO_APP_API_BASE（构建期注入）
```

## 📦 数据迁移（云开发 → MongoDB）

已有云开发数据的迁移脚本已就绪（`server/scripts/migrate.js`）：

1. 云开发控制台导出 `users` / `trips` 集合 JSON → `server/data/`
2. `cd server && npm run migrate`（幂等，自动补算老数据的 `departureEndTime`）

## 🎨 设计系统

Apple 风格设计语言：`#f5f5f7` 背景 + 主题蓝、毛玻璃卡片、分层阴影、
性别色彩区分、路线时间线可视化、统一加载/空/错误状态。

## 🔑 核心设计决策

1. **时区修复**：`departureEndTime` 由前端按设备时区算成绝对时间戳（ms）随行程存储，
   后端只比较数字 —— 彻底避免云函数时代"服务器 UTC 解析字符串偏 8 小时"的坑。
2. **过期行程隐藏**：广场列表过滤 `departureEndTime <= now` 的行程；
   "我创建的/我加入的"仍完整可见（后端 `my-trips` 不做时间过滤）。
3. **联系方式保护**：手机/学号/微信仅对行程参与者可见（前端 `isParticipant` 判断）。
4. **匿名 uid 鉴权**：网站用户无需注册，本地生成持久 uid（`x-uid` 头），
   服务端据此建档/识别。强度可满足校园互助场景，后续可升级 JWT。
5. **字符串 _id**：与云开发导出的 `_id` 语义一致，前端链接/状态不受影响。

## ⚠️ 已弃用内容

- `cloudfunctions/`：方案 A 的微信云函数。若不再维护小程序体验版可整体删除。
- `@cloudbase/js-sdk`：已从依赖移除；小程序端如需连自建后端，`lib/cloud.ts`
  的 `Taro.request` 封装天然跨端可用（需配置小程序 request 合法域名）。

## 📝 License

MIT © 2025
