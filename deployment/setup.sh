#!/bin/bash

# Exit on error
set -e

# Update system
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
echo "Installing MySQL..."
sudo apt install -y mysql-server

# Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx

# Install PM2 globally
echo "Installing PM2..."
sudo npm install -g pm2

# Install Certbot for SSL
echo "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /var/www/app/{frontend,backend}
sudo chown -R ubuntu:ubuntu /var/www/app

# Copy Nginx configuration
sudo cp ./nginx/app.conf /etc/nginx/sites-available/app.conf
sudo ln -s /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Validate Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Setup PM2 to start on boot
sudo pm2 startup systemd 