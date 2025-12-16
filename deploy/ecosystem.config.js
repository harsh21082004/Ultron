module.exports = {
  apps: [
    {
      name: "server", 
      cwd: "./server", 
      script: "index.js", 
      env_file: ".env", 
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      }
    },
    {
      name: "fastapi-backend",
      // CRITICAL FIX: Run from the PARENT directory (fastapi-backend), NOT inside 'app'
      cwd: "/home/ubuntu/Ultron/fastapi-backend",
      
      // Absolute path to the Virtual Environment Python
      script: "/home/ubuntu/Ultron/fastapi-backend/venv/bin/python",
      
      // CRITICAL FIX: Call 'app.main:app' so python understands the folder structure
      args: "-m uvicorn app.main:app --host 0.0.0.0 --port 8000",
      
      interpreter: "none",
      // Absolute path to .env
      env_file: "/home/ubuntu/Ultron/fastapi-backend/.env",
      env: {
        PORT: 8000,
        // CRITICAL FIX: Add the root folder to PYTHONPATH so imports like 'from app.core' work
        PYTHONPATH: "/home/ubuntu/Ultron/fastapi-backend"
      }
    }
  ]
};