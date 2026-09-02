# 方案 B：自建前后端（摆脱微信云开发）

> 当方案 A（CloudBase Web SDK 直连微信云开发环境）实测不通过，或希望彻底摆脱
> 云开发配额/环境绑定/微信生态限制时，采用本方案。
>
> 核心思路：**前端继续复用（Taro H5 产物已就绪），后端从云开发迁到自建
> Node API + MongoDB**——只重写"云函数 → REST API"这一层 + 前端网络层，
> 业务逻辑与数据结构全部沿用。

---

## 1. 为什么需要方案 B

| 方案 A 的遗留风险 | 方案 B 的解决 |
|---|---|
| CloudBase Web SDK 能否访问微信云开发环境**待实测** | 完全不依赖云开发，无兼容性问题 |
| 云开发免费额度限制（调用次数/存储） | 自建数据库无此限制 |
| 环境绑定腾讯云/微信账号，换平台麻烦 | 代码与平台解耦，可部署任意服务器 |
| 云函数冷启动慢、调试链路长 | 本地即可调试 API |

## 2. 目标架构

```
┌─────────────────────────────────────────────┐
│  浏览器（SPA）                               │
│  ┌───────────────────────────────────────┐  │
│  │  前端：Taro H5（已编译成功，代码不改） │  │
│  │  页面/组件/Store/业务逻辑 全部复用     │  │
│  │  lib/cloud.ts → 改为 HTTP 封装        │  │
│  └───────────────┬───────────────────────┘  │
└──────────────────┼──────────────────────────┘
                   │ REST (JSON)
┌──────────────────▼──────────────────────────┐
│  API Server：Node.js + Express              │
│  ├─ 鉴权中间件（uid 头 / JWT）              │
│  ├─ 路由：把 11 个云函数逻辑平移为 REST      │
│  └─ 业务逻辑与现有云函数保持一致             │
└──────────────────┬──────────────────────────┘
                   │ Mongoose
┌──────────────────▼──────────────────────────┐
│  MongoDB（MongoDB Atlas M0 免费版）          │
│  users / trips 两个集合，结构不变            │
└─────────────────────────────────────────────┘
```

**关键决策：前端不重写**。方案 A 已经打通了 Taro → H5 编译（`web/` 产物可用），
页面/组件/store 全部保留；只把 `lib/cloud.ts` 从 CloudBase SDK 换成 `fetch` 调
自建 API，把 11 个云函数翻译成 Express 路由。相比"前端也重写"的工作量省一大半。

## 3. 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 前端 | Taro H5（保留现状） | 零重写，仅改网络层 |
| 网络层 | 原生 fetch / axios 封装 | 替换 `lib/cloud.ts` |
| 后端 | Node.js + Express + Mongoose | 云函数逻辑平移 |
| 数据库 | MongoDB Atlas（M0 免费 512MB） | 或本机/服务器自装 MongoDB |
| 鉴权 | 免注册 uid（localStorage）起步 | 与 CloudBase 匿名登录对齐，后续可升级 |
| 部署 | 腾讯云轻量服务器 / Railway / Render | 域名 + 备案（国内）或海外免备案 |

## 4. API 设计（11 个云函数 → REST）

| 云函数 | REST 端点 | 说明 |
|---|---|---|
| login | `GET /api/auth` | 用 `x-uid` 查/建用户档案 |
| updateProfile | `PATCH /api/profile` | 白名单字段同云函数 |
| createTrip | `POST /api/trips` | 校验同云函数 |
| listTrips | `GET /api/trips` | query: date/keyword/departureNames/…+分页 |
| getTrip | `GET /api/trips/:id` | 按 id 查 |
| joinTrip | `POST /api/trips/:id/join` | 校验满员/重复/自己是发起人 |
| leaveTrip | `POST /api/trips/:id/leave` | |
| cancelTrip | `POST /api/trips/:id/cancel` | 仅发起人 |
| completeTrip | `POST /api/trips/:id/complete` | `completedBy` push |
| getMyTrips | `GET /api/my-trips` | created/joined/completed 三组 |
| getPhoneNumber | 删除 | 网站无微信能力，改用手动填写（已是现状） |

## 5. 数据模型（沿用，含之前的时区修复）

```js
// users
{ uid, nickName, phone, gender, studentId?, wechatId?, createdAt }

// trips（与云开发文档一致）
{ creatorId, creator:{...}, departureDate, departureTimeStart, departureTimeEnd,
  departureEndTime,   // ← 前端算好的绝对时间戳（时区修复方案，继续沿用）
  departureLocation, arrivalLocation, ticketTime,
  maxPassengers, currentPassengers, status, passengers:[...], completedBy, note, createdAt }
```

> 时间过滤继续用 `departureEndTime > Date.now()`，后端不做字符串解析，无时区坑。

## 6. 分阶段实施

| 阶段 | 内容 | 预估 |
|---|---|---|
| **P0 后端骨架** | Express + MongoDB 连接 + 鉴权中间件 + 11 组路由（逻辑照抄云函数，补 Mongoose 模型） | 1 天 |
| **P1 网络层替换** | `lib/cloud.ts` 改为 fetch 封装（自动带 `x-uid`）；`initCloud/initUser` 适配；本地 mock 或直连 | 半天 |
| **P2 联调** | 前后端跑通全流程（注册→发布→广场→加入→详情→我的） | 半天 |
| **P3 数据迁移** | 云开发控制台导出 users/trips JSON → 脚本导入 MongoDB（`departureEndTime` 缺失的老数据按北京时间补算） | 半天 |
| **P4 部署** | 后端部署 + `web/` 静态托管 + 域名/备案 | 看环境 |

## 7. 成本对比

| 项 | 方案 A（云开发 Web） | 方案 B（自建） |
|---|---|---|
| 数据库 | 云开发免费额度内 | Atlas M0 免费 512MB，够用 |
| 后端运行 | 云函数（免费额度） | 轻量服务器 ~60 元/年 或 Railway 免费层 |
| 域名 | 需要 | 需要（与 A 相同） |
| 每月固定成本 | ≈ 0（额度内） | ≈ 0~5 元（免费层） |

## 8. 风险与注意

1. **鉴权强度**：免注册 uid 模式（`x-uid` 头）可被伪造，校园互助场景可接受；若后续要防刷，升级为手机号+密码+JWT（工作量大增，不建议现在做）
2. **历史数据**：老 trips 无 `departureEndTime`，迁移脚本要按北京时间补算（与之前的修复逻辑一致）
3. **云开发是否保留**：小程序体验版若还继续用，云函数和 MongoDB 会双写两套数据——建议**二选一**：要么停用小程序（删云函数/不再部署），要么方案 B 仅作网站、小程序继续走云开发（数据不同步，需用户接受）
4. **Taro H5 的 UI 局限**：若后续对网页端 UI 要求高（响应式、PC 适配），Taro H5 偏移动端，届时再考虑前端重写为 Vite React（作为 B2 升级项）

## 9. 与方案 A 的取舍

- **选 A 的前提**：CloudBase Web SDK 实测能连微信云开发环境（省一个后端 + 数据库迁移）
- **选 B 的前提**：A 实测失败，或不想被云开发绑定
- **建议**：先花 30 分钟把 A 的实测做完（开启匿名登录 + `dev:h5`），结果决定 A/B——A 通了就用 A，不通立刻切 B（P0 半天就能出后端骨架，损失很小）
