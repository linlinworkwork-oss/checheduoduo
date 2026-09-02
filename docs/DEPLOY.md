# 上线部署指南（Railway + MongoDB Atlas，免费方案）

> 适用于：校园拼车网站版（方案 B：Express + MongoDB）。
> 前端 H5 产物与后端同域部署，一个服务搞定，无需单独托管前端、无跨域问题。
> 前提：已有一个 GitHub 账号，代码仓库在 GitHub（本项目已有 remote: checheduoduo）。

## 架构

```
用户浏览器 ──https──▶ Railway 服务（server/ 目录）
                        ├─ GET /            → 前端静态页（server/web/，已随代码提交）
                        └─ GET/POST /api/*  → Express API
                                │
                                └─ MongoDB Atlas（免费 M0 集群，环境变量 MONGODB_URI）
```

- 前端 `lib/cloud.ts` 的 API 地址走**同源相对路径** `/api`（构建时 TARO_APP_API_BASE 留空），
  因此页面和接口同域，无 CORS、无跨域配置。
- `server/web/` 是 H5 构建产物（**已提交进 git**），后端启动时自动托管（见 src/app.js）。

## 一、MongoDB Atlas（免费数据库）

1. 打开 https://www.mongodb.com/cloud/atlas → Sign Up（可用 Google/GitHub 账号）
2. 创建免费集群：选 **M0 Free**（区域建议选 **Singapore / Mumbai**，离国内近）
3. 建好后：
   - **Database Access** → Add New User：用户名/密码自己设（如 `pinche` / 强密码），权限 Atlas admin
   - **Network Access** → Add IP：选 **Allow access from anywhere**（`0.0.0.0/0`）——临时图省事，正式可收紧
   - **Database** → Browse Collections → Create Database：库名 `pinche`，集合随便建一个（如 `users`）
4. **Connect** → Drivers → 复制连接串，形如：
   ```
   mongodb+srv://pinche:<password>@cluster0.xxxxx.mongodb.net/pinche
   ```
   ⚠️ 把 `<password>` 换成第 3 步设的密码，末尾的 `/pinche` 就是你的库名。

## 二、Railway（免费托管后端 + 前端）

Railway 免费额度（每月 $5 等价用量）对一个 Node 服务 + 少量流量足够；
也提供免费域名（`*.up.railway.app`，自动 HTTPS），无需备案。

### 方式 A：GitHub 连接（推荐，改代码自动重新部署）

1. 把本地代码推到 GitHub：
   ```bash
   git add -A
   git commit -m "chore: plan B web backend (Express+MongoDB) + deploy prep"
   git push origin main
   ```
2. 打开 https://railway.app → Sign Up（GitHub 登录最快）→ New Project
3. 选 **Deploy from GitHub repo** → 选 `checheduoduo` 仓库 → Add Variable 那步先跳过
4. 进入服务 → **Settings**：
   - **Root Directory** 填 `server`（关键！只部署后端目录）
5. **Variables**（环境变量）新增：
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | 第一步复制的连接串 |
   | `PORT` | `3000`（Railway 会自动注入 PORT，不填也行） |
   | `SERVE_WEB` | `true`（默认就是 true，可省） |
6. Railway 会自动 `npm install && npm start`（server/package.json 已配好）。
   等 Deployments 变 **Active**。
7. 打开 **Settings → Networking → Generate Domain**（或 New Project 时生成的
   `xxx.up.railway.app`），浏览器访问即为你的网站。

### 方式 B：Railway CLI（不想用 GitHub 时）

```bash
# 安装 CLI（macOS）
brew install railway
# 或 npm i -g @railway/cli

cd server
railway login
railway init
railway variables set MONGODB_URI="mongodb+srv://..."
railway up        # 部署 server/ 当前目录
railway domain    # 生成域名
```

## 三、验证

1. 浏览器打开你的 `*.up.railway.app`：
   - 能看到行程广场页面（前端 OK）
   - 广场能加载演示数据（无）→ 显示"暂无行程"是正常的（新库无数据）
2. 点"我的"→ 编辑资料填手机号 → 发布一条行程 → 广场应出现
3. 换个浏览器（= 新匿名用户）搜索并加入该行程

## 四、日常更新（方式 A）

```bash
# 改完前端：重新构建并同步产物
bash scripts/deploy-prepare.sh     # 构建 H5 并拷到 server/web/
# 改完后端：直接提交
git add -A && git commit -m "..." && git push origin main
# Railway 检测到 push 自动重新部署
```

> 只改了后端代码时无需重新构建前端；只改了前端时必须先跑
> `bash scripts/deploy-prepare.sh` 让产物进 git。

## 五、成本与限额

| 项 | 免费额度 | 说明 |
|---|---|---|
| MongoDB Atlas M0 | 512MB 存储 | 校园场景足够；超了再升级 |
| Railway | $5/月等价用量 | 一个 Node 服务约 $2-3/月，在免费额度内 |
| 域名 | `*.up.railway.app` | 免费自动 HTTPS；自定义域名需另购+DNS |

## 六、注意

- **数据是全新的**：网站与微信云开发是两套独立数据（选择了不迁移）。
- **鉴权强度**：匿名 uid 可伪造，校园互助可接受；后续要加固再升级 JWT。
- **国内访问**：Railway 节点多在海外，国内访问速度一般；如果正式推广且要国内快，
  再考虑迁移到国内服务器（需备案），代码无需改动。
- **休眠**：Railway 免费服务无流量时不会休眠（区别于 Render），可放心。
