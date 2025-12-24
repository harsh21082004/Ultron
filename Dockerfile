# --- STAGE 1: BUILD ANGULAR FRONTEND ---
# Fix: Ensure 'AS' is uppercase to avoid warning
FROM node:20 AS build-step

WORKDIR /app

# 1. Increase memory
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 2. Copy ALL client files first
COPY client/ .

# 3. CRITICAL: Delete any node_modules or lock files that came from Windows
# This ensures we start 100% clean inside Linux
RUN rm -rf node_modules package-lock.json dist

# 4. Fresh Install (Linux Compatible)
RUN npm install --legacy-peer-deps --force

# 5. Build
# Using npx to ensure we use the local angular cli
RUN npx ng build --configuration production

# --- STAGE 2: FINAL IMAGE (Node + Python) ---
FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

WORKDIR /app

# 1. Install Supervisor
RUN apt-get update && \
    apt-get install -y supervisor && \
    rm -rf /var/lib/apt/lists/*

# --- SETUP PYTHON ---
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