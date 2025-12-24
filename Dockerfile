# --- STAGE 1: BUILD ANGULAR FRONTEND ---
# CHANGED: Use standard 'node:20' (Debian) instead of 'alpine' to prevent build errors
FROM node:20 as build-step

WORKDIR /app

# 1. Copy package files first
COPY client/package.json client/package-lock.json ./

# 2. Install dependencies
# ADDED: --legacy-peer-deps to prevent crashing on version conflicts
# ADDED: --force to ensure it works even if cache is corrupted
RUN npm install --legacy-peer-deps --force

# 3. Copy the rest of the client code
COPY client/ .

# 4. Build for production
RUN npm run build -- --configuration production

# --- STAGE 2: FINAL IMAGE (Node + Python) ---
FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

WORKDIR /app

# 1. Install Supervisor
RUN apt-get update && \
    apt-get install -y supervisor && \
    rm -rf /var/lib/apt/lists/*

# --- SETUP PYTHON (Backend) ---
COPY fastapi-backend/app/requirements.txt ./fastapi-backend/
RUN pip install --no-cache-dir -r fastapi-backend/app/requirements.txt
COPY fastapi-backend/ ./fastapi-backend/

# --- SETUP NODE (Server) ---
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev --legacy-peer-deps
COPY server/ ./

# --- COPY BUILT FRONTEND ---
# Ensure this path matches your angular output. 
# If your build creates 'dist/browser', change 'dist/ultron-ai' to 'dist/browser' below.
COPY --from=build-step /app/dist/ultron-ai ../client/dist/ultron-ai

# Return to root
WORKDIR /app

# --- CONFIGURATION ---
RUN echo "[supervisord]" > /etc/supervisord.conf && \
    echo "nodaemon=true" >> /etc/supervisord.conf && \
    \
    # 1. Python Process
    echo "[program:python-api]" >> /etc/supervisord.conf && \
    echo "directory=/app/fastapi-backend" >> /etc/supervisord.conf && \
    echo "command=uvicorn main:app --host 0.0.0.0 --port 8000" >> /etc/supervisord.conf && \
    echo "stdout_logfile=/dev/stdout" >> /etc/supervisord.conf && \
    echo "stdout_logfile_maxbytes=0" >> /etc/supervisord.conf && \
    \
    # 2. Node.js Process
    echo "[program:node-api]" >> /etc/supervisord.conf && \
    echo "directory=/app/server" >> /etc/supervisord.conf && \
    echo "command=node index.js" >> /etc/supervisord.conf && \
    echo "stdout_logfile=/dev/stdout" >> /etc/supervisord.conf && \
    echo "stdout_logfile_maxbytes=0" >> /etc/supervisord.conf

# Expose ports
EXPOSE 80 3000 8000

# Start Supervisor
CMD ["supervisord", "-c", "/etc/supervisord.conf"]