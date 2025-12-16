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
      // CRITICAL FIX: Run inside the 'app' folder where main.py exists
      cwd: "./fastapi-backend/app", 
      // Point to the python executable in the PARENT folder's venv
      script: "../venv/bin/python", 
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000",
      interpreter: "none", 
      // Load the .env file from the PARENT folder
      env_file: "../.env", 
      env: {
        PORT: 8000,
        PYTHONPATH: "."
      }
    }
  ]
};