const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User'); // Adjust the path to your User model


// --- Google OAuth Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback' // This must match the URL in your Google Cloud Console
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if the user already exists in your database
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // If user exists, continue
        return done(null, user);
      } else {
        // If user does not exist, create a new user in your database
        const newUser = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          profilePic: profile.photos[0].value,
          // Social logins don't have a password in the traditional sense
          password: 'social_login_placeholder' // Or handle this as per your schema
        });
        await newUser.save();
        return done(null, newUser);
      }
    } catch (error) {
      return done(error, false);
    }
  }
));

// --- GitHub OAuth Strategy ---
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/api/auth/github/callback', // This must match the URL in your GitHub OAuth App settings
    scope: ['user:email'] // Important: to get the user's email
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // GitHub provides emails in a separate array; find the primary one.

      let email = null;

      // 1. Check if the emails array exists and has items
      if (profile.emails && profile.emails.length > 0) {
        // Try to find one marked as primary
        const primaryEmailObj = profile.emails.find(e => e.primary);
        
        if (primaryEmailObj) {
          email = primaryEmailObj.value;
        } else {
          // Fallback: If no 'primary' flag, just take the first one (fixes your specific error)
          email = profile.emails[0].value;
        }
      }

      // 2. Secondary fallback: check the raw JSON payload
      if (!email && profile._json && profile._json.email) {
        email = profile._json.email;
      }

      // If we still don't have an email, we can't proceed securely
      if (!email) {
        return done(new Error("No email found for this GitHub user"), null);
      }

      let user = await User.findOne({ email: email });

      if (user) {
        return done(null, user);
      } else {
        const newUser = new User({
          name: profile.displayName || profile.username,
          email: email,
          profilePic: profile.photos[0].value,
          password: 'social_login_placeholder'
        });
        await newUser.save();
        return done(null, newUser);
      }
    } catch (error) {
      return done(error, false);
    }
  }
));

// Note: Passport also has serializeUser and deserializeUser methods, but since we are
// using JWTs and setting `session: false`, they are not required for this flow.
