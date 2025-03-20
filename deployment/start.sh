#!/bin/sh

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
while ! nc -z db 3306; do
  sleep 1
done
echo "MySQL is ready!"

# Initialize Prisma
echo "Initializing Prisma..."
npx prisma generate

# Reset database and apply migrations
echo "Resetting database and applying migrations..."
npx prisma migrate reset --force

# Start the server
echo "Starting the server..."
node dist/index.js 