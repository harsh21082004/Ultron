# --- STAGE 1: BUILD ANGULAR FRONTEND ---
FROM node:20 as build-step

WORKDIR /app

# 1. Copy package files
COPY client/package.json client/package-lock.json ./

# 2. Install dependencies (Force used to ignore legacy conflicts)
RUN npm install --legacy-peer-deps --force

# 3. Copy client code & Build
COPY client/ .
RUN npm run build -- --configuration production

# --- STAGE 2: FINAL IMAGE (Node + Python) ---
FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

WORKDIR /app

# 1. Install Supervisor
RUN apt-get update && \
    apt-get install -y supervisor && \
    rm -rf /var/lib/apt/lists/*

# --- SETUP PYTHON (Backend) ---
# FIX: Copy requirements to the root temporarily to avoid path confusion
COPY fastapi-backend/app/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the source code structure
COPY fastapi-backend/ ./fastapi-backend/

# --- SETUP NODE (Server) ---
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev --legacy-peer-deps
COPY server/ ./

# --- COPY BUILT FRONTEND ---
# Ensure this output path matches your angular.json (dist/ultron-ai vs dist/browser)
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
    # FIX: Since main.py is likely inside 'app' folder based on your req.txt path
    # We use 'app.main:app' to tell uvicorn to look inside the app folder
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