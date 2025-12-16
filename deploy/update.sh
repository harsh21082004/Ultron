#!/bin/bash

# Stop on any error
set -e

echo "🚀 Starting Update Process..."

# 1. Pull latest code from GitHub
echo "📥 Pulling latest code..."
git pull origin main

# 2. Update Dependencies
echo "📦 Updating Node dependencies..."
# cd server && npm install && cd .. 

echo "🧹 Fixing Client Dependencies (Deep Clean)..."
cd client
# Remove lockfile to force Linux resolution
rm -f package-lock.json
# Remove corrupted node_modules from the crash
rm -rf node_modules
# Install dependencies fresh
npm install --legacy-peer-deps
cd ..

# 3. Rebuild Angular Frontend
echo "🏗️  Rebuilding Angular Frontend..."
cd client
export NODE_OPTIONS="--max-old-space-size=4096"
# Set CI=true to prevent Angular CLI from asking interactive questions
export CI=true
ng build --configuration production
cd ..

# 4. Deploy Frontend to Nginx
echo "deployment... Copying files to Nginx..."
# Clean old files
sudo rm -rf /var/www/html/*
# Copy new build (Ensure 'client' matches your dist folder name)
sudo cp -r client/dist/client/* /var/www/html/

# 5. Restart Backends
echo "🔄 Restarting Backend Servers..."
pm2 restart all

echo "✅ Update Complete! Your app is live with new changes."