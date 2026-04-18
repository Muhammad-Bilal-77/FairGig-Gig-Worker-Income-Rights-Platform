# Docker Setup Guide for FairGig

## Build & Run All Services with Docker Compose

### Prerequisites
- Docker Desktop installed
- Docker Compose v2.0+

### Option 1: Build and Run Everything

```bash
# Build all service images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Build Specific Services

```bash
# Build only grievance service
docker-compose build grievance-service

# Build only analytics service
docker-compose build analytics-service

# Build only postgres
docker-compose build postgres
```

### Verify Services Are Running

```bash
# Check container status
docker-compose ps

# Test service health
curl http://localhost:4001/health    # Auth Service
curl http://localhost:4002/health    # Earnings Service
curl http://localhost:4003/health    # Anomaly Service
curl http://localhost:4004/health    # Grievance Service
curl http://localhost:4005/health    # Analytics Service
```

### Service Ports

| Service | Port | Type |
|---------|------|------|
| Auth Service | 4001 | Node.js |
| Earnings Service | 4002 | Python |
| Anomaly Service | 4003 | Python |
| Grievance Service | 4004 | Node.js |
| Analytics Service | 4005 | Python |
| PostgreSQL | 5433 | Database |
| Redis | 6379 | Cache |
| Nginx | 80 | Gateway |
| Prometheus | 9090 | Metrics |
| Grafana | 3010 | Dashboard |

### View Logs for Specific Service

```bash
# Grievance Service
docker-compose logs -f grievance-service

# Analytics Service
docker-compose logs -f analytics-service

# All services
docker-compose logs -f
```

### Run Tests in Container

```bash
# Build grievance service and run tests
docker-compose build grievance-service
docker-compose run --rm grievance-service npm test

# Build analytics service and run tests
docker-compose build analytics-service
docker-compose run --rm analytics-service python test_analytics_service.py
```

### Network

All services are on the `fairgig-net` bridge network and can communicate using service names:
- `postgres:5432` for database
- `redis:6379` for cache
- `grievance-service:4004` for grievance API
- `analytics-service:4005` for analytics API

### Environment Variables

Create a `.env` file in the project root:

```env
JWT_ACCESS_SECRET=your_secret_key_here
NODE_ENV=development
GRIEVANCE_PORT=4004
ANALYTICS_PORT=4005
ANOMALY_PORT=4003
EARNINGS_PORT=4002
```

### Troubleshooting

**Service won't start:**
```bash
# Check service logs
docker-compose logs grievance-service

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up
```

**Database connection issues:**
```bash
# Verify postgres is healthy
docker-compose logs postgres

# Check postgres port
netstat -an | grep 5433
```

**Port already in use:**
```bash
# Find process using port
netstat -ano | findstr :4005

# Stop the process or use different port in docker-compose.yml
```
