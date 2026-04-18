# Auth Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/auth-service/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY services/auth-service/src ./src

# Expose port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4001/health || exit 1

# Start service
CMD ["node", "src/index.js"]
