# --- STAGE 1: BUILD ANGULAR FRONTEND ---
FROM node:20-alpine as build-step
WORKDIR /app
# 1. Copy client package files
COPY client/package.json client/package-lock.json ./
# 2. Install Angular dependencies
RUN npm install
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
# Copy requirements (Your path is correct: fastapi-backend/requirements.txt)
COPY fastapi-backend/requirements.txt ./fastapi-backend/
RUN pip install --no-cache-dir -r fastapi-backend/requirements.txt
COPY fastapi-backend/ ./fastapi-backend/

# --- SETUP NODE (Server) ---
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev
COPY server/ ./

# --- COPY BUILT FRONTEND ---
# We take the built files from Stage 1 and put them in the client/dist folder
# Node.js will serve them from here
COPY --from=build-step /app/dist/ultron-ai ../client/dist/ultron-ai

# Return to root
WORKDIR /app

# --- CONFIGURATION ---
RUN echo "[supervisord]" > /etc/supervisord.conf && \
    echo "nodaemon=true" >> /etc/supervisord.conf && \
    \
    # 1. Python Process (FIXED COMMAND)
    echo "[program:python-api]" >> /etc/supervisord.conf && \
    echo "directory=/app/fastapi-backend" >> /etc/supervisord.conf && \
    # FIX: Changed 'app.main:app' to 'main:app' because main.py is at the root of the folder
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