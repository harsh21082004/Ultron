module.exports = {
  apps: [
    {
      name: "server", // Updated name as requested
      script: "./server/index.js", 
      env_file: "./server/.env", // Explicitly load .env
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      }
    },
    {
      name: "fastapi-backend",
      // CRITICAL FIX: Use the python inside the venv, not the system python
      script: "./venv/bin/python", 
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000",
      cwd: "./fastapi-backend",
      interpreter: "none", // We provide the binary path in 'script', so no interpreter needed
      env_file: "./fastapi-backend/.env",
      env: {
        PORT: 8000
      }
    }
  ]
};