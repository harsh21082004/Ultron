const Chat = require('../models/Chat');

/**
 * Saves or updates a chat conversation in the database.
 */
const saveChat = async (req, res) => {
  try {
    const { chatId, messages, title } = req.body;
    const userId = req.user.id; // From 'protect' middleware

    if (!chatId || !messages || messages.length === 0) {
      return res.status(400).json({ message: 'Missing required chat data.' });
    }

    // Find and update using the chatId from the frontend as the document's _id.
    const updatedChat = await Chat.findOneAndUpdate(
      { _id: chatId, userId: userId }, // Query by document _id and owner's userId
      { 
        $set: { 
          messages: messages,
          title: title
        },
        $setOnInsert: { // On creation, ensure these fields are set
          _id: chatId,
          userId: userId
        }
      },
      // new: returns the modified document, upsert: creates it if it doesn't exist
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Chat saved successfully.', chat: updatedChat });

  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ message: 'Server error while saving chat.' });
  }
};

/**
 * Retrieves all chat histories (just titles and IDs) for the authenticated user.
 */
const getAllChats = async (req, res) => {
    try {
        const userId = req.user.id;
        // Find all chats for the user, but only select the title and _id fields.
        // Sort by the most recently updated.
        const chats = await Chat.find({ userId: userId })
            .select('title _id')
            .sort({ updatedAt: -1 });

        res.status(200).json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ message: 'Server error while fetching chats.' });
    }
};

/**
 * Retrieves the full message history for a single chat.
 */
const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;
        
        const chat = await Chat.findOne({ _id: chatId, userId: userId });
        
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found.' });
        }
        
        // Return just the messages array for the found chat
        res.status(200).json(chat.messages);
    
    } catch (error) {
        console.error('Error fetching chat details:', error);
        res.status(500).json({ message: 'Server error fetching chat details.' });
    }
}

const deleteAllChats = async (req, res) => {
  try{
    const userid = req.user.id;
    if(!userid){
      return res.status(400).json({message: "User ID is required"})
    }
    await Chat.deleteMany({userId: userid});
    res.status(200).json({message: "all Chats Cleared"})
  }catch(err){
    rest.status(500).json({message: "Server Error while deleting chats"})
  }
}


module.exports = {
  saveChat,
  getAllChats,
  getChatById,
  deleteAllChats
};

