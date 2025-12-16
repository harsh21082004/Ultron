#!/bin/bash

# Stop on any error
set -e

echo "🚀 Starting Update Process..."

# 1. Pull latest code from GitHub
echo "📥 Pulling latest code..."
git pull origin main

# 2. Free up RAM for the build
echo "🛑 Stopping backends to free memory..."
pm2 stop all || true

# 3. Update Dependencies (Standard Install)
echo "📦 Updating dependencies..."
# cd server && npm install && cd .. 

cd client
# Reverted to standard install (Fast) since binary mismatch is fixed
npm install --legacy-peer-deps
cd ..

# 4. Rebuild Angular Frontend
echo "🏗️  Rebuilding Angular Frontend..."
cd client
export NODE_OPTIONS="--max-old-space-size=4096"
# Set CI=true to prevent Angular CLI from asking interactive questions
export CI=true
ng build --configuration production
cd ..

# 5. Deploy Frontend to Nginx
echo "deployment... Copying files to Nginx..."
# Clean old files
sudo rm -rf /var/www/html/*
# Copy new build (Ensure 'client' matches your dist folder name)
sudo cp -r client/dist/client/* /var/www/html/

# 6. Restart Backends
echo "🔄 Restarting Backend Servers..."
pm2 restart all

echo "✅ Update Complete! Your app is live with new changes."