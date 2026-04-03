# NexaCall - Video Meeting Platform

## Docker Commands
```bash
# Build Docker image (fresh build without cache)
docker-compose build --no-cache

# Build with specific service
docker-compose build --no-cache backend

# View all Docker images
docker images

# Remove old image (if needed)
docker rmi nexacall-backend -f

# Run in foreground (see all logs - BEST for development)
docker-compose up

# Run in background (detached mode - BEST for production)
docker-compose up -d

# Run specific service only
docker-compose up backend

# Stop all containers
docker-compose down

# Stop and remove volumes (delete database data)
docker-compose down -v

# View container logs (exit with Ctrl+C)
docker logs nexacall-backend

# View real-time streaming logs
docker-compose logs -f

# View last 100 lines of logs
docker logs --tail 100 nexacall-backend

# View logs with timestamps
docker-compose logs -t
```