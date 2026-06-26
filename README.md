# 🚗 校园拼车 - Campus Carpool Mini Program

基于 **Taro 4.x + React 18 + TypeScript + 微信云开发** 的校园拼车微信小程序，为高校学生提供安全、便捷的拼车出行服务。

<p align="center">
  <img src="https://img.shields.io/badge/Taro-4.x-blue?logo=taro" alt="Taro">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/State-Zustand-8B5CF6" alt="Zustand">
  <img src="https://img.shields.io/badge/Cloud-WeChat%20CloudBase-07C160?logo=wechat" alt="CloudBase">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

## ✨ 功能亮点

| 模块 | 功能 | 说明 |
|------|------|------|
| 🏠 **行程广场** | 浏览、筛选、搜索拼车行程 | 按日期 / 关键词检索，实时展示拼车状态 |
| ✏️ **发布行程** | 创建拼车行程 | 出发时间区间、地点选择器、期望人数、备注 |
| 📋 **行程详情** | 查看参与者 & 加入/退出 | 展示发起人及参与者信息（性别、行李大小），一键加入或退出 |
| 👤 **个人中心** | 编辑资料 & 管理行程 | 昵称、手机号、性别、行李大小；查看"我发起的"和"我加入的"行程 |
| 📱 **手机号收集** | 首次使用引导填写 | 弹窗式交互，支持跳过稍后填写 |

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────┐
│                    微信小程序                     │
│  ┌───────────┬───────────┬───────────────────┐  │
│  │  Plaza    │  Create   │  Profile / Detail │  │
│  │  行程广场  │  发布行程  │  个人中心 / 详情   │  │
│  └─────┬─────┴─────┬─────┴─────────┬─────────┘  │
│        │           │               │            │
│  ┌─────┴───────────┴───────────────┴─────────┐  │
│  │         Zustand Store (状态管理)           │  │
│  │    userStore / tripStore                  │  │
│  └─────────────────┬─────────────────────────┘  │
│                    │                            │
│  ┌─────────────────┴─────────────────────────┐  │
│  │         Cloud Function Wrapper             │  │
│  │    withTimeout / 统一错误处理               │  │
│  └─────────────────┬─────────────────────────┘  │
└────────────────────┼────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────┐
│            微信云开发 (CloudBase)                 │
│  ┌──────────┬──────┴───────┬──────────────────┐ │
│  │  login   │  createTrip  │  listTrips       │ │
│  │  joinTrip│  leaveTrip   │  cancelTrip      │ │
│  │  complete│  getMyTrips  │  updateProfile   │ │
│  └──────────┴──────────────┴──────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │      云数据库 (users / trips 集合)          │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 📦 技术栈

| 层 | 选型 | 说明 |
|---|------|------|
| 框架 | Taro 4.x + React 18 | 跨端小程序框架，Write once, run anywhere |
| 语言 | TypeScript 5.x | 类型安全，更好的开发体验 |
| 状态管理 | Zustand 4.x | 轻量、无 boilerplate、支持 selector 优化 |
| 样式方案 | SCSS + CSS Custom Properties | Apple 风格设计系统，设计令牌统一管理 |
| 后端 | 微信云开发 (CloudBase) | Serverless 云函数 + 文档型数据库 |
| 构建 | Webpack 5 + Babel | Taro 内置，支持 Tree Shaking |

## 🎨 设计系统

采用 **Apple 风格** 设计语言：

- **色彩**: `#f5f5f7` 背景 + `#007aff` 主题蓝 + 性别色彩区分（蓝/粉）
- **字体**: SF 风格系统字体栈，多层次字重
- **质感**: 毛玻璃卡片（glass-surface）、分层阴影系统
- **交互**: 路线时间线可视化、统一加载/空/错误状态
- **组件**: 自定义 trip-card、phone-popup 等复合组件

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- 微信开发者工具
- 微信小程序 AppID（[注册](https://mp.weixin.qq.com/)）
- 开通微信云开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境

```bash
# 复制配置模板
cp .env.example .env
# 编辑 .env，填入你的云开发环境 ID
```

修改 `project.config.json` 中的 `appid` 为你的小程序 AppID。

### 3. 创建数据库集合

在微信云开发控制台 → 数据库中创建：

| 集合 | 权限 |
|------|------|
| `users` | 仅创建者可读写 |
| `trips` | 所有用户可读，仅创建者可写 |

### 4. 部署云函数

在微信开发者工具中，右键 `cloudfunctions/` 下各函数目录 → "上传并部署：云端安装依赖"：

```
cloudfunctions/
├── login/          # 微信登录
├── createTrip/     # 创建行程
├── listTrips/      # 行程列表（支持筛选/搜索）
├── joinTrip/       # 加入拼车
├── leaveTrip/      # 退出拼车
├── cancelTrip/     # 取消行程
├── completeTrip/   # 完成行程
├── updateProfile/  # 更新个人资料
└── getMyTrips/     # 我的行程
```

### 5. 启动开发

```bash
npm run dev:weapp
```

在微信开发者工具中导入 `dist/` 目录即可预览。

### 6. 生产构建

```bash
npm run prod:weapp
```

## 📁 项目结构

```
pinche/
├── src/
│   ├── app.config.ts              # 小程序配置（tabBar / 路由）
│   ├── app.tsx                    # 入口组件（云初始化 + 用户登录）
│   ├── app.scss                   # 全局样式 + CSS 设计令牌
│   ├── components/
│   │   ├── trip-card/             # 行程卡片（列表 & 详情复用）
│   │   └── ui/
│   │       └── phone-popup.tsx    # 手机号填写弹窗
│   ├── pages/
│   │   ├── plaza/                 # 行程广场（列表 + 筛选搜索）
│   │   ├── create/                # 发布行程（表单 + 地点选择器）
│   │   ├── detail/                # 行程详情（参与者 + 操作按钮）
│   │   └── profile/               # 个人中心（信息展示 & 编辑）
│   ├── stores/
│   │   ├── userStore.ts           # 用户状态（Zustand）
│   │   └── tripStore.ts           # 行程状态（Zustand）
│   ├── hooks/
│   │   └── useCloudFunction.ts    # 通用云函数调用 Hook
│   └── lib/
│       ├── cloud.ts               # 云函数封装（超时 / 错误处理）
│       └── constants.ts           # 常量 & 枚举数据
├── cloudfunctions/                # 云函数（Node.js）
├── config/                        # Taro 构建配置
├── types/                         # 全局类型声明
├── .env.example                   # 环境变量模板
├── project.config.json            # 小程序项目配置
└── tsconfig.json
```

## 🔑 核心设计决策

### 1. 云函数超时控制

所有云函数调用通过 `withTimeout` 包装，25s 超时自动 reject，避免用户长时间等待。

### 2. 手机号收集策略

首次使用时弹窗引导填写，支持跳过。发布 / 加入行程前二次校验，确保联系方式完整。

### 3. 状态管理选型

选择 Zustand 而非 Redux：小程序包体积敏感，Zustand 仅 1KB，API 简洁，无 Provider 嵌套。

### 4. 不可变更新

所有 Store 更新遵循不可变模式，通过扩展运算符返回新对象，避免直接 mutation。

## 📝 License

MIT © 2025
