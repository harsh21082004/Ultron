const Chat = require('../models/Chat');
const { processMessagesForSave } = require('../utils/chat-processor');

const saveChat = async (req, res) => {
  try {
    const { chatId, messages, title, currentLeafId } = req.body;
    const userId = req.user.id;

    if (!chatId || !messages || messages.length === 0) {
      return res.status(400).json({ message: 'Missing required chat data.' });
    }

    // --- STEP 1: Process Images (Base64 -> GCS URL) ---
    // This mutates the message array to replace heavy strings with URLs
    const cleanMessages = await processMessagesForSave(messages, userId);

    // --- STEP 2: Save to MongoDB ---
    const updatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId: userId },
      { 
        $set: { 
          messages: cleanMessages, // Save the cleaned messages
          title: title,
          currentLeafId: currentLeafId 
        },
        $setOnInsert: { _id: chatId, userId: userId }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Chat saved successfully.', chat: updatedChat });
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ message: 'Server error while saving chat.' });
  }
};

const getAllChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const chats = await Chat.find({ userId: userId })
            .select('title _id')
            .sort({ updatedAt: -1 });
        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;
        const chat = await Chat.findOne({ _id: chatId, userId: userId });
        
        if (!chat) return res.status(404).json({ message: 'Chat not found.' });
        
        // FIX: Return object with messages AND leaf ID
        res.status(200).json({ 
            messages: chat.messages, 
            currentLeafId: chat.currentLeafId 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
}

const deleteAllChats = async (req, res) => {
  try {
    const userId = req.user.id;
    await Chat.deleteMany({ userId: userId });
    res.status(200).json({ message: "All Chats Cleared" });
  } catch (err) { res.status(500).json({ message: "Server Error" }); }
}

const searchChats = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;
    if (!query) return res.status(200).json([]);
    
    // Search logic remains same (searching the flat array is fine for snippets)
    const chats = await Chat.find({
      userId: userId,
      $or: [ { title: new RegExp(query, 'i') }, { 'messages.content.value': new RegExp(query, 'i') } ]
    }).select('title _id updatedAt messages').sort({ updatedAt: -1 }).limit(20).lean();

    const results = chats.map(chat => {
       // Take the very last message in the array for snippet
       const lastMsg = chat.messages[chat.messages.length - 1]; 
       let snippet = lastMsg?.content?.find(c => c.type === 'text')?.value || '';
       if (snippet.length > 100) snippet = snippet.substring(0, 100) + '...';
       return { _id: chat._id, title: chat.title, lastMessage: snippet, updatedAt: chat.updatedAt };
    });
    res.status(200).json(results);
  } catch (err) { res.status(500).json({ message: "Error" }); }
};

module.exports = { saveChat, getAllChats, getChatById, deleteAllChats, searchChats };