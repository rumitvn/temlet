# Docker Setup for Temlet

This document explains how to use Docker to run the Temlet system in a more reliable and portable way.

## 🚀 Quick Start

### Prerequisites

1. **Docker** - Install Docker Desktop for Windows/Mac or Docker Engine for Linux
2. **Docker Compose** - Usually included with Docker Desktop
3. **Git** - To clone the repository

### Development Environment

1. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd nexrender-manager
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Start development environment:**
   ```bash
   npm run docker:dev
   # or
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Access your application:**
   - Main App: http://localhost:3001
   - Nexrender Server: http://localhost:3000
   - Database: localhost:5432
   - Redis: localhost:6379

### Production Environment

1. **Setup production environment:**
   ```bash
   cp env.example .env.prod
   # Edit .env.prod with production values
   ```

2. **Start production environment:**
   ```bash
   npm run docker:prod
   # or
   docker-compose -f docker-compose.prod.yml up --build
   ```

## 📁 File Structure

```
nexrender-manager/
├── Dockerfile                 # Production Docker image
├── Dockerfile.dev            # Development Docker image
├── docker-compose.yml        # Production services
├── docker-compose.dev.yml    # Development services
├── docker-compose.prod.yml   # Production with nginx
├── nginx.conf               # Nginx reverse proxy config
├── .dockerignore            # Files to exclude from Docker
├── env.example              # Environment variables template
└── scripts/
    └── monitor.js           # Monitoring script
```

## 🔧 Services Overview

### Development Services (`docker-compose.dev.yml`)

1. **database** - PostgreSQL 15 for development
2. **redis** - Redis 7 for caching and job queue
3. **nexrender-server** - Nexrender server instance
4. **nexrender-worker-1** - First worker instance
5. **nexrender-worker-2** - Second worker instance
6. **app** - Next.js application with hot reloading
7. **monitor** - Monitoring service

### Production Services (`docker-compose.prod.yml`)

1. **database** - PostgreSQL 15 for production
2. **redis** - Redis 7 for production
3. **nexrender-server** - Nexrender server
4. **nexrender-worker** - Scalable worker instances (2 replicas)
5. **app** - Production Next.js application
6. **monitor** - Production monitoring service
7. **nginx** - Reverse proxy with SSL support

## 🛠️ Available Commands

### Development Commands
```bash
npm run docker:dev          # Start development environment
npm run docker:down:dev     # Stop development environment
npm run docker:logs:dev     # View development logs
```

### Production Commands
```bash
npm run docker:prod         # Start production environment
npm run docker:down         # Stop production environment
npm run docker:logs         # View production logs
```

### General Docker Commands
```bash
# View running containers
docker ps

# View logs for specific service
docker-compose logs -f app

# Restart specific service
docker-compose restart app

# Scale workers (production)
docker-compose -f docker-compose.prod.yml up --scale nexrender-worker=4

# Clean up volumes
docker-compose down -v
```

## 🔐 Environment Variables

Create a `.env` file based on `env.example`:

```bash
# Database
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://nexrender:password@database:5432/nexrender

# Redis
REDIS_URL=redis://redis:6379

# Nexrender
NEXRENDER_SECRET=your_secret_key
NEXRENDER_SERVER_URL=http://nexrender-server:3000

# App
NODE_ENV=production
PORT=3001
```

## 📊 Monitoring and Health Checks

### Health Check Endpoints
- **App Health**: http://localhost:3001/api/health
- **Nginx Health**: http://localhost/health

### Monitoring
The system includes automatic monitoring that:
- Checks application health every 5 seconds
- Logs any issues
- Restarts failed services automatically

## 🚀 Deployment Options

### Local Development
```bash
npm run docker:dev
```

### Production Server
```bash
npm run docker:prod
```

### Cloud Deployment (AWS, GCP, Azure)
1. Set up a cloud server with Docker
2. Copy your project files
3. Configure environment variables
4. Run: `docker-compose -f docker-compose.prod.yml up -d`

### Kubernetes Deployment
The Docker setup can be easily converted to Kubernetes manifests for cluster deployment.

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 3001, 5432, 6379 are available
2. **Permission issues**: On Linux, you might need to run with `sudo`
3. **Memory issues**: Increase Docker memory allocation in Docker Desktop settings

### Debug Commands
```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs -f --tail=100

# Access container shell
docker-compose exec app sh

# Check database connection
docker-compose exec database psql -U nexrender -d nexrender
```

### Reset Everything
```bash
# Stop and remove everything
docker-compose down -v --remove-orphans

# Remove all images
docker system prune -a

# Start fresh
npm run docker:dev
```

## 📈 Scaling

### Scale Workers
```bash
# Development
docker-compose -f docker-compose.dev.yml up --scale nexrender-worker-1=2 --scale nexrender-worker-2=2

# Production
docker-compose -f docker-compose.prod.yml up --scale nexrender-worker=4
```

### Load Balancing
The nginx configuration in production provides load balancing and rate limiting.

## 🔒 Security

### Production Security Checklist
- [ ] Change default passwords in `.env`
- [ ] Use strong `NEXRENDER_SECRET`
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## 📝 Migration from PM2

### Before (PM2)
```bash
pm2 start ecosystem.config.cjs
pm2 logs
pm2 restart all
```

### After (Docker)
```bash
npm run docker:dev
npm run docker:logs:dev
npm run docker:down:dev && npm run docker:dev
```

## 🎯 Benefits of Docker Setup

1. **Reliability**: Automatic restarts and health checks
2. **Portability**: Works on any system with Docker
3. **Isolation**: Each service runs in its own container
4. **Scalability**: Easy to scale individual services
5. **Consistency**: Same environment across development and production
6. **Easy Deployment**: Simple commands to deploy anywhere
7. **Resource Management**: Better resource utilization
8. **Monitoring**: Built-in health checks and logging

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review Docker and application logs
3. Ensure all prerequisites are installed
4. Verify environment variables are set correctly 