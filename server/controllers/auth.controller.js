const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { protect } = require('../middlewares/auth.middleware');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
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
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ user, token });
  } catch (error) {
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
      // 3. If it's a social account, return a specific error.
      return res.status(403).json({
        message: 'This account was created using a social provider. Please use Google or GitHub to log in.'
      });
    }

    // 4. If it's a regular account, compare the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // 5. If password is correct, create and send JWT
    const payload = { _id: user._id, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ user, token });

  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error });
  }
};

const getUserDetails = async (req, res) => {
  try {
    // Use middleware to get user from token
    const userDetails = req.user;
    res.status(200).json(userDetails);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

const socialLoginCallback = (req, res) => {
  // Passport attaches the authenticated user object to `req.user`
  const user = req.user;

  console.log(user)

  // 1. Create a JWT payload
  const payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    profilePic: user.profilePic
  };

  // 2. Sign the JWT
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });

  // 3. TIWARI JI: Determine the Frontend URL based on environment
  // If running on Vercel, process.env.FRONTEND_URL should be set.
  // If local, fallback to localhost:4200
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

  // 4. Redirect to the Angular "auth/callback" route with the token
  res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
};

module.exports = { signup, login, getUserDetails, socialLoginCallback };
