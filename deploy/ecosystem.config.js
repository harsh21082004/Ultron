module.exports = {
  apps: [
    {
      name: "node-backend",
      script: "./server/index.js", 
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        MONGO_URI: "mongodb://localhost:27017/chat-db"
      }
    },
    {
      name: "python-ai-backend",
      script: "python3",
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000",
      cwd: "./backend_python",
      interpreter: "none",
      env: {
        PORT: 8000
      }
    }
  ]
};