# =====================================================
# Dockerfile — بوت ديسكورد (Multi-stage build)
# =====================================================

# ---------- مرحلة البناء ----------
FROM node:20-bookworm-slim AS build

# أدوات تجميع الحزم الأصلية (canvas + @napi-rs)
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 make g++ \
        pkg-config \
        libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# تثبيت الاعتماديات (يُخزَّن في الكاش حتى لا يُعاد عند تغيير المصدر)
COPY package.json package-lock.json ./
RUN npm ci

# نسخ المصدر وبناؤه
COPY tsconfig.json ./
COPY src ./src
COPY dashboard ./dashboard
RUN npm run build

# ---------- مرحلة التشغيل ----------
FROM node:20-bookworm-slim AS runtime

# مكتبات تشغيل canvas والرموز الرسومية
RUN apt-get update && apt-get install -y --no-install-recommends \
        libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# نسخ الاعتماديات الكاملة (تشمل الوحدات الأصلية المبنية)
COPY --from=build /app/node_modules ./node_modules
# نسخ الكود المبنّى والواجهة
COPY --from=build /app/dist ./dist
COPY --from=build /app/dashboard ./dashboard

# مجلدات البيانات (تُركّب كـ Volumes)
RUN mkdir -p /app/data /app/logs

EXPOSE 3000

CMD ["node", "dist/index.js"]
