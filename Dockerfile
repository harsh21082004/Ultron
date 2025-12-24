# --- STAGE 1: BUILD ANGULAR FRONTEND ---
FROM node:20 AS build-step

# 1. Set Root Workdir
WORKDIR /app

# 2. Copy the entire client folder into /app/client
# This preserves your directory structure exactly like your laptop
COPY client/ ./client/

# 3. Enter the client folder
WORKDIR /app/client

# 4. CRITICAL CLEANUP
# Delete Windows artifacts to force a clean Linux install
RUN rm -rf node_modules package-lock.json dist

# 5. Fresh Install
# We install INSIDE /app/client/node_modules
RUN npm install --legacy-peer-deps --force

# 6. Build
# This runs 'ng build' inside /app/client, just like you do locally
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
COPY fastapi-backend/ ./fastapi-backend/

# --- SETUP NODE ---
COPY server/package.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev --legacy-peer-deps
COPY server/ ./

# --- COPY FRONTEND ---
# FIX: Copy from the preserved structure: /app/client/dist/client
WORKDIR /app
COPY --from=build-step /app/client/dist/client /app/client/dist/client

# Return to root
WORKDIR /app

# --- CONFIGURATION ---
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
    echo "stderr_logfile=/dev/stderr" >> /etc/supervisord.conf && \
    echo "stderr_logfile_maxbytes=0" >> /etc/supervisord.conf && \
    \
    # Node Config
    echo "[program:node-api]" >> /etc/supervisord.conf && \
    echo "directory=/app/server" >> /etc/supervisord.conf && \
    echo "command=node index.js" >> /etc/supervisord.conf && \
    echo "stdout_logfile=/dev/stdout" >> /etc/supervisord.conf && \
    echo "stdout_logfile_maxbytes=0" >> /etc/supervisord.conf && \
    echo "stderr_logfile=/dev/stderr" >> /etc/supervisord.conf && \
    echo "stderr_logfile_maxbytes=0" >> /etc/supervisord.conf

EXPOSE 80 3000 8000
CMD ["supervisord", "-c", "/etc/supervisord.conf"]