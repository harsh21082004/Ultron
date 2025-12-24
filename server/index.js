const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // <--- FIXED: Added missing import
dotenv.config();
const passport = require('passport');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Configs & Routes
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const shareRoutes = require('./routes/share.routes');
const uploadRoutes = require('./routes/upload.routes');

// Connect to Database
connectDB();

const app = express();
app.enable('trust proxy');

// Middleware
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    optionsSuccessStatus: 200,
    credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Passport
app.use(passport.initialize());
require('./config/passport.config');

// --- 1. PYTHON PROXY ---
// Send /api/py requests to the Python container
app.use(
  '/api/py',
  createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  })
);

// --- 2. NODE API ROUTES (MUST BE BEFORE ANGULAR) ---
// FIXED: Moved these UP so they aren't blocked by the catch-all
app.get('/api', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats/share', shareRoutes);
app.use('/api/upload', uploadRoutes);

// --- 3. SERVE ANGULAR FRONTEND ---
const angularPath = path.join(__dirname, '../client/dist/client');

// Serve static files
app.use(express.static(angularPath));

// --- 4. CATCH-ALL ROUTE (MUST BE LAST) ---
// Send index.html for any request that didn't match an API route above
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(angularPath, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;