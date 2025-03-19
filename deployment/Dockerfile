# Build frontend
FROM node:18 AS frontend-builder
WORKDIR /app
COPY new-gaming-site/package*.json ./
RUN npm install
COPY new-gaming-site/ .
RUN npm run build

# Build backend
FROM node:18 AS backend-builder
WORKDIR /app
COPY new-gaming-site/server/package*.json ./
RUN npm install
COPY new-gaming-site/server/ .
RUN npm run build

# Production image
FROM node:18-slim
WORKDIR /app

# Copy backend build
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/prisma ./prisma

# Copy frontend build
COPY --from=frontend-builder /app/build ./public

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"] 