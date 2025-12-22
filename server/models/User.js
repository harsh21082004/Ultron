const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // --- NEW: Profile & Personalization ---
  profilePic: { type: String, default: '' }, // URL to S3/Cloudinary
  
  preferences: {
    language: { type: String, default: 'English' }, // e.g., 'Hindi', 'Spanish'
    theme: { type: String, default: 'system' },     // 'light', 'dark', 'system'
    dataRetention: { type: Number, default: 30 }    // Days to keep chat history (optional)
  },

  // Track shared chats for "Data Control"
  sharedChats: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat' 
  }]

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);