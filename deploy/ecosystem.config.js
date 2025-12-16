module.exports = {
  apps: [
    {
      name: "server",
      script: "./server/index.js", 
      env_file: "./server/.env",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      }
    },
    {
      name: "fastapi-backend",
      script: "python3",
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000",
      cwd: "./fastapi-backend",
      interpreter: "none",
      env_file: "./fastapi-backend/.env",
      env: {
        PORT: 8000
      }
    }
  ]
};