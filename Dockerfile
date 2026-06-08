# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Install system dependencies:
# - ffmpeg: video processing
# - python3/make/g++: native module builds (e.g. sharp)
# - curl: container HEALTHCHECK
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (devDependencies are needed to build: next, tailwind, prisma)
RUN npm ci

# Copy application code
COPY . .

# Generate the Prisma client (reads prisma/schema.prisma; no DB connection required)
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "start"]
