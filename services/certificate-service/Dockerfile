# Certificate Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY services/certificate-service/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY services/certificate-service/src ./src

# Expose port
EXPOSE 4006

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:4006/health || exit 1

# Start service
CMD ["npm", "start"]
