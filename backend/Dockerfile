# ============================================
# Stage 1: Build Stage (For compiling TypeScript to JavaScript)
# ============================================
FROM node:20 AS builder

WORKDIR /app

# Install build dependencies for MediaSoup
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (for better caching)
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY src ./src

# Build the NestJS app (creates dist folder)
RUN npm run build

# ============================================
# Stage 2: Development Stage (For hot-reload development)
# ============================================
FROM node:20 AS development

WORKDIR /app

# Install build dependencies, Chromium, FFmpeg, and Xvfb
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    chromium \
    ffmpeg \
    xvfb \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/nest-cli.json ./

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Copy source code (will be overridden by volume mount for hot-reload)
COPY src ./src

# Expose port
EXPOSE 3000

# Run in development mode with watch mode
CMD ["npm", "run", "start:dev"]

# ============================================
# Stage 3: Production Stage (For production deployment)
# ============================================
FROM node:20 AS production

# Install Chromium, FFmpeg, and Xvfb dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    xvfb \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only production dependencies and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Create non-root user for security
# RUN addgroup -g 1001 -S nodejs && \
#     adduser -S nodejs -u 1001

# USER nodejs

# Expose port
EXPOSE 3000

# Health check (optional)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the app in production mode
CMD ["node", "dist/main.js"]