# 后端 + 前端同域镜像
# 构建上下文 = server/ 目录（含 src/、web/ 产物、package.json）
FROM node:20-alpine

WORKDIR /app

# 先装依赖（利用缓存）
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# 拷贝源码与前端产物
COPY src ./src
COPY web ./web

ENV NODE_ENV=production
ENV SERVE_WEB=true
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/index.js"]
