# NexaCall - Video Meeting Platform

> Professional online meeting platform

## Tech Stack

| Technology     | Purpose                            |
| :------------- | :--------------------------------- |
| **NestJS**     | Backend API & WebSocket Server     |
| **PostgreSQL** | Database for meetings & recordings |
| **pgAdmin**    | Web-based Database Management      |
| **Docker**     | Containerization & Deployment      |
| **TypeORM**    | ORM for Database operations        |

<!--
| **WebRTC** | Real-time video communication |
-->

---

## Docker Commands - Complete Reference

<details>
<summary><b>Image & Container Management</b></summary>

```bash
# Build Docker image (fresh build without cache)
docker-compose build --no-cache

# Build specific service only
docker-compose build --no-cache backend

# Build with cache (faster)
docker-compose build

# View all Docker images
docker images

# Remove specific image
docker rmi nexacall-backend -f

# Remove all unused images
docker image prune -f

# Remove all stopped containers
docker container prune -f

# Complete system cleanup (be careful!)
docker system prune -a -f
```

</details>

<details>
<summary><b>Running Containers</b></summary>

```bash
# Run in foreground (see all logs - BEST for development)
docker-compose up

# Run in background (detached mode - BEST for production)
docker-compose up -d

# Run specific service only
docker-compose up backend

# Run only postgres and pgadmin
docker-compose up -d postgres pgadmin

# Stop all containers
docker-compose down

# Stop and remove volumes (delete database data)
docker-compose down -v

# Restart specific service
docker-compose restart backend

# Pause container
docker-compose pause backend

# Unpause container
docker-compose unpause backend
```

</details>

<details>
<summary><b>Viewing Logs</b></summary>

```bash
# View container logs (exit with Ctrl+C)
docker logs nexacall-backend

# View real-time streaming logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# View last 100 lines of logs
docker logs --tail 100 nexacall-backend

# View logs with timestamps
docker-compose logs -t

# View logs since last 10 minutes
docker logs --since 10m nexacall-backend
```

</details>

<details>
<summary><b>Container Inspection</b></summary>

```bash
# Go inside container (interactive shell)
docker exec -it nexacall-backend sh

# List files inside container
docker exec -it nexacall-backend ls -la /app

# View source code inside container
docker exec -it nexacall-backend ls -la /app/src

# Get container IP address
docker inspect nexacall-backend | grep IPAddress

# Get detailed container information
docker inspect nexacall-backend

# Check if app is running inside container
docker exec -it nexacall-backend curl localhost:3000

# Check health endpoint
docker exec -it nexacall-backend curl http://localhost:3000/health

# Check container resource usage
docker stats nexacall-backend

# View environment variables inside container
docker exec -it nexacall-backend env

# Check Node.js version inside container
docker exec -it nexacall-backend node --version
```

</details>

<details>
<summary><b>Development & Debugging</b></summary>

```bash
# Check container status
docker-compose ps

# Check all containers (including stopped)
docker ps -a

# Remove stopped containers
docker container prune -f

# Check resource usage
docker stats nexacall-backend

# View network details
docker network inspect nexacall_nexacall-network

# Check disk usage by Docker
docker system df

# Remove dangling images
docker image prune -f

# Remove unused volumes
docker volume prune -f
```

</details>

<details>
<summary><b>Cleaning Up & Database</b></summary>

```bash
# Stop and remove everything (containers, networks)
docker-compose down

# Remove everything including volumes (database data)
docker-compose down -v

# Remove specific container
docker-compose rm -f backend

# Remove specific image
docker rmi nexacall-backend -f

# Remove all stopped containers
docker container prune -f

# Remove all unused images
docker image prune -a -f

# Remove all unused volumes
docker volume prune -f

# Complete cleanup (use with caution!)
docker system prune -a -f --volumes

# Access PostgreSQL inside container
docker exec -it nexacall-postgres psql -U nexacall_user -d nexacall_db

# List all tables in database
docker exec -it nexacall-postgres psql -U nexacall_user -d nexacall_db -c "\dt"

# Describe a specific table
docker exec -it nexacall-postgres psql -U nexacall_user -d nexacall_db -c "\d users"

# Backup database
docker exec -t nexacall-postgres pg_dump -U nexacall_user nexacall_db > backup.sql

# Restore database
cat backup.sql | docker exec -i nexacall-postgres psql -U nexacall_user nexacall_db

# Check PostgreSQL logs
docker logs nexacall-postgres

# Check pgAdmin logs
docker logs nexacall-pgadmin
```

**pgAdmin Web Interface:**

- URL: [http://localhost:5050](http://localhost:5050)
- Email: `admin@nexacall.com`
- Password: `admin123`

</details>

<details>
<summary><b>Volume Management</b></summary>

```bash
# List all volumes
docker volume ls

# Inspect a specific volume
docker volume inspect nexacall_postgres_data

# Remove specific volume
docker volume rm nexacall_postgres_data

# Remove all unused volumes
docker volume prune -f
```

**Volume locations (WSL2):**
`\\wsl$\docker-desktop-data\version-pack-data\community\docker\volumes\`

</details>

---

## Backend Development Commands

```bash
# Create new resource (controller, service, module, dto, entity)
nest g res users

# Create just a controller
nest g controller meetings

# Create just a service
nest g service meetings

# Create just a module
nest g module meetings

# Build the application
npm run build

# Run in development mode
npm run start:dev

# Run in production mode
npm run start:prod

# Go inside container (interactive shell)
docker exec -it nexacall-backend sh

# Run database seeds
npm run seed:run

# Create new seeder file
npm run seed:create

# Interceptor Create
nest g interceptor <interceptor-name>

# Interceptor Shortcut
nest g itc <interceptor-name>
```
