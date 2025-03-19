#!/bin/bash

# Exit on error
set -e

# Configuration
FRONTEND_SRC="../frontend/build"
BACKEND_SRC="../backend"
APP_DIR="/var/www/app"

# Deploy frontend
echo "Deploying frontend..."
if [ -d "$FRONTEND_SRC" ]; then
    sudo rm -rf $APP_DIR/frontend/*
    sudo cp -r $FRONTEND_SRC/* $APP_DIR/frontend/
else
    echo "Frontend build directory not found!"
    exit 1
fi

# Deploy backend
echo "Deploying backend..."
if [ -d "$BACKEND_SRC" ]; then
    sudo rm -rf $APP_DIR/backend/*
    sudo cp -r $BACKEND_SRC/* $APP_DIR/backend/
    cd $APP_DIR/backend
    npm install --production
else
    echo "Backend directory not found!"
    exit 1
fi

# Restart PM2 processes
echo "Restarting PM2 processes..."
pm2 reload all

echo "Deployment completed successfully!" 