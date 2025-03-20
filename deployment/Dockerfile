# Frontend build stage
FROM node:18 AS frontend-builder
WORKDIR /app
COPY new-gaming-site/package*.json ./
RUN npm install
COPY new-gaming-site/ .
RUN npm run build

# Frontend production stage
FROM node:18-slim AS frontend
WORKDIR /app
COPY --from=frontend-builder /app/build ./build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]

# Backend build stage
FROM node:18 AS backend-builder
WORKDIR /app
COPY new-gaming-site/server/package*.json ./
RUN npm install
COPY new-gaming-site/server/ .
RUN npm run build

# Backend production stage
FROM node:18-slim AS backend
WORKDIR /app

# Install build dependencies and netcat
RUN apt-get update && \
    apt-get install -y netcat-traditional python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first
COPY --from=backend-builder /app/package*.json ./

# Install dependencies and rebuild native modules
RUN npm install --production && \
    npm rebuild bcrypt

# Copy the rest of the application
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/prisma ./prisma
COPY deployment/start.sh ./
RUN chmod +x start.sh

EXPOSE 8080
CMD ["./start.sh"] 