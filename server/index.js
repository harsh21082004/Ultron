const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const shareRoutes = require('./routes/share.routes');
const uploadRoutes = require('./routes/upload.routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const passport = require('passport');
const { createProxyMiddleware } = require('http-proxy-middleware');


connectDB();

const app = express();

app.enable('trust proxy');

// Add cors options for production and development
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    optionsSuccessStatus: 200,
    credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

// --- Passport Initialization ---
app.use(passport.initialize());
// Import the passport config file to execute the strategy setup.
require('./config/passport.config'); 

// 1. --- PYTHON PROXY (Must be BEFORE the Angular catch-all) ---
// Any request starting with /api/py gets sent to the Python backend on port 8000
app.use(
  '/api/py',
  createProxyMiddleware({
    target: 'http://127.0.0.1:8000', // Python is running locally on port 8000
    changeOrigin: true,
    // OPTIONAL: If your Python code expects "/chat" instead of "/api/py/chat",
    // uncomment the line below to remove the "/api/py" prefix before sending.
    // pathRewrite: { '^/api/py': '' }, 
  })
);

const angularPath = path.join(__dirname, '../client/dist/client');

// Serve static files (JS, CSS, Images)
app.use(express.static(angularPath));

// 4. --- CATCH-ALL ROUTE ---
// If it's not an API call, send the Angular index.html
// This allows Angular's internal routing (e.g. /login, /dashboard) to work
app.get('*', (req, res) => {
  res.sendFile(path.join(angularPath, 'index.html'));
});

// TIWARI JI: This route now handles both '/' (Local) and '/api' (Vercel)
app.get(['/api'], (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats/share', shareRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// TIWARI JI: This check allows Vercel to export the app without listening on a port,
// while still letting you run it locally with `node server/index.js`.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;