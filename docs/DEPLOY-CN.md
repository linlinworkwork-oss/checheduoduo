# 国内上线部署指南（腾讯云轻量服务器 + 域名备案）

> 适用：校园拼车网站版（方案 B：Express + MongoDB），面向国内正式使用。
> 特点：国内访问快、稳定合规；需要**域名备案**（1~2 周审核）。
> 技术路线：Docker Compose 一键部署（MongoDB + App + Caddy 自动 HTTPS）。

## 总体流程（按顺序）

```
① 注册腾讯云 → ② 买域名 → ③ 买轻量服务器 → ④ 提交备案（等 1-2 周）
→ ⑤ 备案通过 → ⑥ 服务器装 Docker → ⑦ 一键部署 → ⑧ 域名解析 → ⑨ 上线验证
```

> ③ 买到服务器后就可以先做 ⑥⑦ 用 **IP 临时访问** 验证功能，不必干等备案；
> 备案期间只是**不能用域名**对外提供 80/443 服务。

---

## ① 注册腾讯云

- 打开 https://cloud.tencent.com 注册并**实名认证**（个人认证即可，需身份证）
- 建议顺便完成**微信绑定**，备案 App 操作方便

## ② 购买域名

- 腾讯云控制台 → 域名注册：https://console.cloud.tencent.com/domain
- 推荐 `.cn`（约 30 元/年）或 `.com`（约 60 元/年）
- 名称建议与拼车相关，如 `pinche`、`carpool`、`cheyou` 等，试哪些没被注册
- 买完做**域名实名认证**（与备案主体一致，审核约 1 天）

## ③ 购买轻量服务器

- 腾讯云轻量应用服务器：https://console.cloud.tencent.com/lighthouse
- 推荐配置：**2核2G**、系统 **Ubuntu 22.04**、地域选**离你学校/用户近的**（如广州/上海）
- 新用户常有大促价（300-500 元/年）；先按月买也行
- 买后记下**公网 IP**

## ④ 提交备案

- 腾讯云备案：https://console.cloud.tencent.com/beian
- 按引导填：主办人信息（身份证、手机号）、网站信息、域名
- 需在**腾讯云备案小程序**做人脸核验
- 审核周期：腾讯云初审 1-2 天 + 管局审核 5-15 天，共约 1-2 周
- ⏳ 等备案期间，跳到 ⑥⑦ 用 IP 先跑起来

## ⑤-⑥ 服务器初始化

SSH 登录服务器（腾讯云控制台 → 轻量服务器 → 登录，或本地终端）：

```bash
# 装 Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
# 装 compose 插件
sudo apt-get update && sudo apt-get install -y docker-compose-plugin
```

## ⑦ 一键部署

```bash
# 在服务器上克隆代码（GitHub 仓库）
git clone git@github.com:linlinworkwork-oss/checheduoduo.git   # 或 https 方式
cd checheduoduo/deploy

# 配置域名
cp .env.example .env
vim .env        # 填 SITE_DOMAIN=你的域名（备案通过后填；先用 IP 测试可不填）

# 启动（首次会构建镜像，几分钟）
docker compose up -d --build
docker compose ps        # 三个服务都 running 即成功
```

**备案通过前临时验证**：直接访问 `http://服务器IP:3000`（App 端口已暴露）
—— 能看到页面即部署成功。

## ⑧ 域名解析

备案通过后，到腾讯云 DNSPod（https://console.cloud.tencent.com/cns）：
- 添加记录：主机记录 `@`、记录类型 **A**、记录值 = **服务器公网 IP**
- 再添加一条 `www` → 同样 A 记录
- 等待解析生效（几分钟 ~ 几小时）

## ⑨ HTTPS 自动生效

Caddy 检测到域名请求会自动申请 Let's Encrypt 证书（无需手动配置）。
然后访问：
- http://你的域名（自动跳 https）
- https://你的域名

> 若 https 没自动生效，检查：域名是否解析到本机、80/443 是否放行
> （腾讯云轻量防火墙 → 防火墙规则 → 放行 80/443）。

---

## 日常维护

```bash
# 查看状态
docker compose ps
docker compose logs -f app

# 更新代码后重新部署
cd checheduoduo && git pull
# 若改了前端：先本地跑 bash scripts/deploy-prepare.sh 再提交推送
cd deploy && docker compose up -d --build

# 备份数据库（重要！）
docker exec pinche-mongo mongodump --db pinche --out /dump
docker cp pinche-mongo:/dump ./backup-$(date +%F)
```

## 费用汇总（参考）

| 项 | 年费 |
|---|---|
| 域名 .cn | ~30 元 |
| 轻量服务器 2C2G | 活动价 300-500 元 |
| 备案 | 0 |
| HTTPS 证书 | 0（Caddy 自动） |
| **合计** | **~350-550 元/年** |

## 常见问题

- **备案期间想让大家先用？** 备案未通过前域名不能解析到国内服务器对外提供网站服务。
  可以先发给少数人用 `http://IP:3000`，或等备案完再正式发链接。
- **换了服务器 IP？** 改 DNSPod 的 A 记录即可，代码不用动。
- **MongoDB 数据备份**见上文"日常维护"。
- **以后想换国内其他厂商**（阿里云等）：代码与部署方式完全通用，仅备案需在新厂商重做。
