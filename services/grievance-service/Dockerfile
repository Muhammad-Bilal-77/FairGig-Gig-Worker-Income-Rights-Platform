# Grievance Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/grievance-service/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY services/grievance-service/src ./src

# Expose port
EXPOSE 4004

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4004/health || exit 1

# Start service
CMD ["node", "src/index.js"]
