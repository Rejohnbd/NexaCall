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

# Install build dependencies for MediaSoup (needed if npm install runs here)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/nest-cli.json ./

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

WORKDIR /app

# Copy only production dependencies and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

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