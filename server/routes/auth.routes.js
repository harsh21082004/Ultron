const express = require('express');
const router = express.Router();
const { signup, login, getUserDetails, socialLoginCallback, updateProfile, getSharedChats, revokeShare, deleteAccount, updatePreferences  } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const passport = require('passport');

router.post('/signup', signup);
router.post('/login', login);
router.get('/get-user-details', protect, getUserDetails); 

// --- Initiate Google Login ---
// This is the route your Angular service redirects to.
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// --- Google Callback Route ---
// Google redirects here after the user authenticates.
router.get(
    '/google/callback',
    // We use `session: false` because we are using JWTs, not sessions.
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    socialLoginCallback
);


// --- Initiate GitHub Login ---
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// --- GitHub Callback Route ---
router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/login' }),
    socialLoginCallback
);

router.put('/profile', protect, updateProfile);
router.put('/preferences', protect, updatePreferences);
router.get('/shared', protect, getSharedChats);
router.post('/revoke-share', protect, revokeShare);
router.delete('/account', protect, deleteAccount);

module.exports = router;
