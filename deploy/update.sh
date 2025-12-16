#!/bin/bash

# Stop on any error
set -e

echo "🚀 Starting Update Process..."

# 1. Pull latest code from GitHub
echo "📥 Pulling latest code..."
git pull origin main

# 2. Update Dependencies (Uncommented for Client to fix missing builder error)
# It is safer to install dependencies on every update to ensure the build environment is correct.
echo "📦 Updating Node dependencies..."
# cd server && npm install && cd .. 

# Clean install for client to ensure Linux binaries (lightningcss) are downloaded correctly
echo "🧹 Cleaning client node_modules to fix binary mismatch..."
cd client 
rm -rf node_modules
npm install --legacy-peer-deps 
cd ..

# echo "🐍 Updating Python dependencies..."
# cd backend_python && source venv/bin/activate && pip install -r requirements.txt && deactivate && cd ..

# 3. Rebuild Angular Frontend
echo "🏗️  Rebuilding Angular Frontend..."
cd client
export NODE_OPTIONS="--max-old-space-size=4096"
# Set CI=true to prevent Angular CLI from asking interactive questions (like autocompletion)
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