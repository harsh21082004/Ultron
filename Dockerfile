# --- STAGE 1: BUILD ANGULAR FRONTEND ---
FROM node:20 as build-step

WORKDIR /app

# 1. Increase memory to prevent build crashes
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 2. Copy client package files
COPY client/package.json client/package-lock.json ./

# 3. Install dependencies
RUN npm cache clean --force && npm install --legacy-peer-deps --force

# 4. Copy client source code
COPY client/ .

# 5. Build for production
# Your angular.json outputs to: dist/client
RUN npm run build -- --configuration production

# --- STAGE 2: FINAL IMAGE (Node + Python) ---
FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

WORKDIR /app

# 1. Install Supervisor
RUN apt-get update && \
    apt-get install -y supervisor && \
    rm -rf /var/lib/apt/lists/*

# --- SETUP PYTHON (Backend) ---
# FIX: Copy from 'fastapi-backend/app/requirements.txt' (Your specific structure)
COPY fastapi-backend/app/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the python code
COPY fastapi-backend/ ./fastapi-backend/

# --- SETUP NODE (Server) ---
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev --legacy-peer-deps
COPY server/ ./

# --- COPY BUILT FRONTEND ---
# FIX: Copy from '/app/dist/client' because that is what your angular.json says
# We place it in 'client/dist/client' so Node.js can find it
COPY --from=build-step /app/dist/client ../client/dist/client

# Return to root
WORKDIR /app

# --- CONFIGURATION ---
RUN echo "[supervisord]" > /etc/supervisord.conf && \
    echo "nodaemon=true" >> /etc/supervisord.conf && \
    \
    # 1. Python Process
    echo "[program:python-api]" >> /etc/supervisord.conf && \
    echo "directory=/app/fastapi-backend" >> /etc/supervisord.conf && \
    # FIX: Using 'app.main:app' because your main.py is inside the 'app' folder
    echo "command=uvicorn app.main:app --host 0.0.0.0 --port 8000" >> /etc/supervisord.conf && \
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