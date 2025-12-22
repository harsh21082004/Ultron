const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Helper to sign tokens consistently
const generateToken = (payload) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const payload = { _id: user._id, name: user.name, email: user.email };
    const token = generateToken(payload);

    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user by their email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 2. CHECK FOR SOCIAL LOGIN PLACEHOLDER
    if (user.password === 'social_login_placeholder') {
      return res.status(403).json({
        message: 'This account was created using a social provider. Please use Google or GitHub to log in.'
      });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // 4. Create and send JWT
    const payload = { _id: user._id, name: user.name, email: user.email };
    const token = generateToken(payload);

    res.status(200).json({ user, token });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
};

// @desc    Get current user details
// @route   GET /api/auth/get-user-details
// @access  Private
const getUserDetails = async (req, res) => {
  try {
    // Middleware attaches user to req.user
    const userDetails = req.user;
    res.status(200).json(userDetails);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Callback for Social Login (Google/GitHub)
// @access  Public (Redirects)
const socialLoginCallback = (req, res) => {
  try {
    // Passport attaches the authenticated user object to `req.user`
    const user = req.user;

    if (!user) {
      return res.redirect('/login?error=authentication_failed');
    }

    // 1. Create a JWT payload
    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic
    };

    // 2. Sign the JWT
    const token = generateToken(payload);

    // 3. Determine the Frontend URL
    // Priority: Env Variable -> Default Production -> Localhost Fallback
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    // 4. Redirect to the Angular "auth/callback" route with the token
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);

  } catch (error) {
    console.error("Social Callback Error:", error);
    res.status(500).send("Authentication Error");
  }
};

// Update Profile (Name, Pic, Language)
const updateProfile = async (req, res) => {
  try {
    const { name, profilePic, preferences } = req.body;
    const userId = req.user.id;

    console.log(req.body)

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (profilePic) user.profilePic = profilePic;

    // Update nested preferences safely
    Object.assign(user.preferences, preferences);

    console.log('Updated preferences:', user.preferences);


    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Data Control: Get all Shared Chats
const getSharedChats = async (req, res) => {
  try {
    // Assuming you have a 'shareId' field in your Chat model from previous steps
    const chats = await Chat.find({
      userId: req.user.id,
      shareId: { $exists: true, $ne: null }
    }).select('title shareId createdAt');

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shared chats' });
  }
};

// Data Control: Revoke/Delete a Shared Link
const revokeShare = async (req, res) => {
  try {
    const { chatId } = req.body;
    await Chat.findOneAndUpdate(
      { _id: chatId, userId: req.user.id },
      { $unset: { shareId: "", shareUrl: "" } } // Removes the fields
    );
    res.json({ message: 'Link revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error revoking link' });
  }
};

// Data Control: Delete Account & Data
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Delete all Chats
    await Chat.deleteMany({ userId });

    // 2. Delete User
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account and data permanently deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account' });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log('Current preferences:', user.preferences, preferences)

    // Update preferences
    Object.assign(user.preferences, preferences);

    console.log('Updated preferences:', user.preferences);

    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ message: 'Preferences updated', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating preferences', error: error.message });
  }
};

module.exports = { signup, login, getUserDetails, socialLoginCallback, updateProfile, getSharedChats, revokeShare, deleteAccount, updatePreferences };