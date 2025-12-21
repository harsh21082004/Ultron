const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const shareRoutes = require('./routes/share.routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const passport = require('passport');


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
// This must come before your routes are defined.
app.use(passport.initialize());
// Import the passport config file to execute the strategy setup.
require('./config/passport.config'); 

// TIWARI JI: This route now handles both '/' (Local) and '/api' (Vercel)
app.get(['/', '/api'], (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats/share', shareRoutes);

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