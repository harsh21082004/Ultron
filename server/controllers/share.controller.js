const { v4: uuidv4 } = require('uuid');
const SharedChat = require('../models/SharedChat');
const Chat = require('../models/Chat');

exports.createShareLink = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.id;
    const chat = await Chat.findOne({ _id: chatId, userId: userId });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const existingShare = await SharedChat.findOne({ originalChatId: chatId });
    if (existingShare) {
      return res.json({ shareId: existingShare.shareId, shareUrl: `${process.env.FRONTEND_URL}/share/${existingShare.shareId}` });
    }

    const shareId = uuidv4();
    const newShare = new SharedChat({ 
      shareId,
      originalChatId: chatId,
      originalUserId: userId,
      title: chat.title || 'Shared Chat',
      messages: chat.messages,
      currentLeafId: chat.currentLeafId // Save view
    });

    await newShare.save();
    res.json({ shareId, shareUrl: `${process.env.FRONTEND_URL}/share/${shareId}` });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

exports.getSharedPreview = async (req, res) => {
  try {
    const { shareId } = req.params;
    const sharedChat = await SharedChat.findOne({ shareId });
    if (!sharedChat) return res.status(404).json({ message: 'Shared chat not found' });

    res.json({
      title: sharedChat.title,
      messages: sharedChat.messages,
      currentLeafId: sharedChat.currentLeafId, // Return view
      createdAt: sharedChat.createdAt,
      shareId: sharedChat.shareId
    });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

exports.importSharedChat = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.id;
    const sharedChat = await SharedChat.findOne({ shareId });
    if (!sharedChat) return res.status(404).json({ message: 'Not found' });

    const existingChat = await Chat.findOne({ _id: shareId, userId: userId });
    if (existingChat) return res.status(400).json({ message: 'Already imported' });
    
    const newChat = new Chat({
      _id: shareId,
      userId: userId,
      title: `${sharedChat.title} (Imported)`,
      messages: sharedChat.messages,
      currentLeafId: sharedChat.currentLeafId, // Import view
      createdAt: new Date(), updatedAt: new Date()
    });

    await newChat.save();
    res.json({ chatId: shareId });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};