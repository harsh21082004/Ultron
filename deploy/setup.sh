#!/bin/bash

# 1. Update System
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Dependencies
echo "Installing base dependencies..."
sudo apt install -y curl git python3-pip python3-venv nginx

# 3. Install Node.js (v20)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Install MongoDB
echo "Installing MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# 5. Install Global Tools
echo "Installing global NPM tools..."
sudo npm install -g @angular/cli pm2

echo "Setup complete!"