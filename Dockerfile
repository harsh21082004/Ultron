# --- STAGE 1: BUILD ANGULAR FRONTEND ---
FROM node:20 as build-step

WORKDIR /app

# 1. Increase memory for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 2. Copy ONLY package.json (Ignore package-lock to prevent Windows/Linux conflict)
COPY client/package.json ./

# 3. Clean Install
# We use 'npm install' instead of 'npm ci' so it generates a fresh Linux-compatible lockfile
RUN npm install --legacy-peer-deps

# 4. Copy Source Code
# Since we updated .dockerignore, this will NOT overwrite node_modules anymore!
COPY client/ .

# 5. Build
# Output is 'dist/client' based on your angular.json
RUN npm run build -- --configuration production

# --- STAGE 2: FINAL IMAGE (Node + Python) ---
FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

WORKDIR /app

# 1. Install Supervisor
RUN apt-get update && \
    apt-get install -y supervisor && \
    rm -rf /var/lib/apt/lists/*

# --- SETUP PYTHON ---
# Copy from app/requirements.txt (Your structure)
COPY fastapi-backend/app/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python App
COPY fastapi-backend/ ./fastapi-backend/

# --- SETUP NODE ---
COPY server/package.json ./server/
WORKDIR /app/server
# Fresh install for server too
RUN npm install --omit=dev --legacy-peer-deps
COPY server/ ./

# --- COPY FRONTEND ---
# Copy from the correct angular output folder: dist/client
COPY --from=build-step /app/dist/client ../client/dist/client

# Return to root
WORKDIR /app

# --- CONFIGURATION ---
RUN echo "[supervisord]" > /etc/supervisord.conf && \
    echo "nodaemon=true" >> /etc/supervisord.conf && \
    \
    # Python Config
    echo "[program:python-api]" >> /etc/supervisord.conf && \
    echo "directory=/app/fastapi-backend" >> /etc/supervisord.conf && \
    echo "command=uvicorn app.main:app --host 0.0.0.0 --port 8000" >> /etc/supervisord.conf && \
    echo "stdout_logfile=/dev/stdout" >> /etc/supervisord.conf && \
    echo "stdout_logfile_maxbytes=0" >> /etc/supervisord.conf && \
    \
    # Node Config
    echo "[program:node-api]" >> /etc/supervisord.conf && \
    echo "directory=/app/server" >> /etc/supervisord.conf && \
    echo "command=node index.js" >> /etc/supervisord.conf && \
    echo "stdout_logfile=/dev/stdout" >> /etc/supervisord.conf && \
    echo "stdout_logfile_maxbytes=0" >> /etc/supervisord.conf

EXPOSE 80 3000 8000
CMD ["supervisord", "-c", "/etc/supervisord.conf"]