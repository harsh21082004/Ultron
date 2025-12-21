const mongoose = require('mongoose');

const SharedChatSchema = new mongoose.Schema({
  shareId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalChatId: {
    type: String,
    required: true
  },
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'Shared Chat'
  },
  // We store a snapshot of messages so the share remains valid 
  // even if the original chat is deleted or changed.
  messages: [{
    type: mongoose.Schema.Types.Object,
    ref: 'Chat.messages',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30 // Optional: Auto-delete shared links after 30 days
  }
});

module.exports = mongoose.model('SharedChat', SharedChatSchema);