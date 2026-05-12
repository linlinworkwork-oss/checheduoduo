# 校园拼车小程序

基于 Taro 4.x + React + TypeScript + 微信云开发 的校园拼车微信小程序。

## 功能

- **行程广场** — 按日期/关键词浏览所有拼车行程
- **发布行程** — 创建行程：出发时间区间、地点、票面时间、期望人数
- **行程详情** — 查看参与者信息（性别、行李大小），加入/退出拼车
- **个人中心** — 编辑性别、行李大小，管理我的行程

## 技术栈

| 层 | 选型 |
|---|------|
| 框架 | Taro 4.x + React 18 |
| 语言 | TypeScript |
| 状态管理 | Zustand |
| 样式 | SCSS + CSS 自定义属性（Apple 设计风格） |
| 后端 | 微信云开发（CloudBase） |
| 数据库 | 云开发文档型数据库 |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置微信云开发

1. 在微信公众平台注册小程序，获取 AppID
2. 开通云开发，获取环境 ID
3. 修改 `project.config.json` 中的 `appid` 为你的 AppID
4. 修改 `src/lib/cloud.ts` 中的环境 ID（搜索 `pinche-0g0` 替换为你的环境 ID）

### 3. 创建数据库集合

在微信云开发控制台的数据库中创建以下集合：

- `users` — 用户信息
- `trips` — 行程信息

权限设置：
- `users`: 仅创建者可读写
- `trips`: 所有用户可读，仅创建者可写

### 4. 上传云函数

在微信开发者工具中，右键每个云函数目录并选择"上传并部署：云端安装依赖"：

```
cloudfunctions/
├── login/          # 微信登录
├── createTrip/     # 创建行程
├── listTrips/      # 查询行程列表
├── joinTrip/       # 加入行程
├── leaveTrip/      # 退出行程
├── cancelTrip/     # 取消行程
├── updateProfile/  # 更新个人资料
└── getMyTrips/     # 获取我的行程
```

### 5. 开发运行

```bash
npm run dev:weapp
```

在微信开发者工具中打开 `dist/` 目录即可预览。

### 6. 生产构建

```bash
npm run prod:weapp
```

### 7. Tab 图标

需要在 `src/assets/tab/` 下放置以下图标文件（81x81 px）：

| 文件 | 用途 |
|------|------|
| `plaza.png` | 行程广场（未选中） |
| `plaza-active.png` | 行程广场（选中） |
| `create.png` | 发布行程（未选中） |
| `create-active.png` | 发布行程（选中） |
| `profile.png` | 我的（未选中） |
| `profile-active.png` | 我的（选中） |

添加图标后，在 `src/app.config.ts` 的 tabBar.list 中取消 `iconPath` 和 `selectedIconPath` 的注释。

## 项目结构

```
src/
├── app.config.ts          # 小程序配置
├── app.tsx                # 入口组件
├── app.scss               # 全局样式 + 设计令牌
├── components/
│   └── trip-card/         # 行程卡片组件
├── pages/
│   ├── plaza/             # 行程广场页
│   ├── create/            # 发布行程页
│   ├── detail/            # 行程详情页
│   └── profile/           # 个人中心页
├── stores/
│   ├── userStore.ts       # 用户状态
│   └── tripStore.ts       # 行程状态
├── hooks/
│   └── useCloudFunction.ts
├── lib/
│   ├── cloud.ts           # 云函数封装
│   └── constants.ts       # 常量
└── styles/                # 样式目录
cloudfunctions/            # 云函数
```

## 设计

采用 Apple 风格设计系统：
- SF 风格系统字体栈
- `#f5f5f7` 背景色 + `#007aff` 主题色
- 毛玻璃卡片效果（glass-surface）
- 分层阴影系统
- 路线时间线可视化
- 性别色彩区分（蓝/粉）
