FROM node:20-bookworm-slim

WORKDIR /usr/src/app

ENV NODE_ENV=development
# Не даємо puppeteer-у качати свій chromium (використаємо системний)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Ставимо Chromium та залежності
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies separately for better caching
COPY package.json ./
RUN npm install

# Copy source
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client at build time
RUN npx prisma generate || true

# Ти слухаєш 8080 (судячи з логів), тож краще так:
EXPOSE 8080

# Default dev command with hot reload
CMD sh -c "npx prisma migrate deploy || true; npm run dev"
