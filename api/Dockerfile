FROM node:20-bookworm-slim

WORKDIR /usr/src/app

ENV NODE_ENV=development

# Ensure OpenSSL and required tools are available for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies separately for better caching
COPY package.json ./
RUN npm install

# Copy source
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client at build time
RUN npx prisma generate || true

EXPOSE 3000

# Default dev command with hot reload
CMD sh -c "npx prisma migrate deploy || true; npm run dev"

