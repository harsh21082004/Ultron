const { v4: uuidv4 } = require('uuid');
const SharedChat = require('../models/SharedChat');
const Chat = require('../models/Chat'); // Assuming you have a Chat model

// 1. Create Share Link
exports.createShareLink = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.id; // From auth middleware

    // Check if chat exists and belongs to user
    const chat = await Chat.findOne({ _id: chatId, userId: userId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found or access denied' });
    }

    // Check if already shared (Optional: return existing link)
    const existingShare = await SharedChat.findOne({ originalChatId: chatId });
    if (existingShare) {
      return res.json({ 
        shareId: existingShare.shareId,
        shareUrl: `${process.env.FRONTEND_URL}/share/${existingShare.shareId}`
      });
    }

    // Create new Share ID
    const shareId = uuidv4();

    const newShare = new SharedChat({ 
      shareId,
      originalChatId: chatId,
      originalUserId: userId,
      title: chat.title || 'Shared Chat',
      messages: chat.messages
    });

    await newShare.save();

    res.json({
      shareId,
      shareUrl: `${process.env.FRONTEND_URL}/share/${shareId}`
    });

  } catch (error) {
    console.error('Share creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 2. Get Preview (Public)
exports.getSharedPreview = async (req, res) => {
  try {
    const { shareId } = req.params;
    
    const sharedChat = await SharedChat.findOne({ shareId });
    
    if (!sharedChat) {
      return res.status(404).json({ message: 'Shared chat not found or expired' });
    }

    console.log('Shared chat found:', sharedChat)

    res.json({
      title: sharedChat.title,
      messages: sharedChat.messages,
      createdAt: sharedChat.createdAt,
      shareId: sharedChat.shareId
    });

  } catch (error) {
    console.error('Share preview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 3. Import Chat
exports.importSharedChat = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.id;

    const sharedChat = await SharedChat.findOne({ shareId });
    if (!sharedChat) {
      return res.status(404).json({ message: 'Shared chat not found' });
    }

    // Don't allow importing your own shared chat (Optional check)
    // if (sharedChat.originalUserId.toString() === userId) { ... }

    const existingChat = await Chat.findOne({ _id: shareId, userId: userId });

    if (existingChat) {
      return res.status(400).json({ message: 'You have already imported this chat' });
    }
    
    const newChat = new Chat({
      _id: shareId,
      userId: userId,
      title: `${sharedChat.title} (Imported)`,
      messages: sharedChat.messages,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newChat.save();

    res.json({ chatId: shareId });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};