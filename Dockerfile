# 1. Use a base image with both Python and Node.js
FROM nikolaik/python-nodejs:python3.11-nodejs20

# 2. Set the global working directory
WORKDIR /app

# 3. Install Supervisor (Process Manager)
RUN apt-get update && apt-get install -y supervisor

# --- SETUP PYTHON BACKEND ---
# Copy requirements from the specific folder
COPY fastapi-backend/requirements.txt ./fastapi-backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r fastapi-backend/requirements.txt

# --- SETUP NODE BACKEND ---
# Copy package.json from the specific folder
COPY server/package.json server/package-lock.json ./server/

# Install Node dependencies inside the server folder
WORKDIR /app/server
RUN npm ci --omit=dev

# Return to root
WORKDIR /app

# --- COPY SOURCE CODE ---
# Copy the actual code folders
COPY fastapi-backend ./fastapi-backend
COPY server ./server

# --- CONFIGURE SUPERVISOR ---
# We configure supervisor to run both backends
# Note: We assume your python entry point is app.main:app inside fastapi-backend
RUN echo "[supervisord]" > /etc/supervisord.conf && \
    echo "nodaemon=true" >> /etc/supervisord.conf && \
    \
    # 1. Python Process
    echo "[program:python-api]" >> /etc/supervisord.conf && \
    echo "directory=/app/fastapi-backend" >> /etc/supervisord.conf && \
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

# Expose ports (Azure maps 80/443 to the container)
EXPOSE 3000 8000

# Start Supervisor
CMD ["supervisord", "-c", "/etc/supervisord.conf"]