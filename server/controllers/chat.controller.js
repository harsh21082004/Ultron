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

const searchChats = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query || query.trim() === '') {
      return res.status(200).json([]);
    }

    // Create a case-insensitive regular expression for the search
    const searchRegex = new RegExp(query, 'i');

    // Find chats where the title matches OR any message content matches
    const chats = await Chat.find({
      userId: userId,
      $or: [
        { title: searchRegex },
        { 'messages.content.value': searchRegex }
      ]
    })
    .select('title _id updatedAt messages') // We need messages to extract the snippet
    .sort({ updatedAt: -1 })
    .limit(20) // Limit results for performance
    .lean(); // Convert Mongoose documents to plain JS objects

    // Process results to create a clean response for the frontend
    const results = chats.map(chat => {
      let snippet = '';
      
      // 1. Try to find the specific message that matched the query
      const matchingMessage = chat.messages.find(m => 
        m.content && m.content.some(c => c.type === 'text' && searchRegex.test(c.value))
      );

      if (matchingMessage) {
        // If found, extract that specific text block
        const block = matchingMessage.content.find(c => c.type === 'text' && searchRegex.test(c.value));
        snippet = block ? block.value : '';
      } else {
        // 2. If the match was in the Title (not body), or fallback, show the very last message
        const lastMsg = chat.messages[chat.messages.length - 1];
        const lastBlock = lastMsg?.content?.find(c => c.type === 'text');
        snippet = lastBlock ? lastBlock.value : '';
      }

      // Truncate snippet if it's too long
      if (snippet.length > 100) {
        snippet = snippet.substring(0, 100) + '...';
      }

      return {
        _id: chat._id,
        title: chat.title,
        lastMessage: snippet, // Frontend uses this property for the subtitle
        updatedAt: chat.updatedAt
      };
    });

    res.status(200).json(results);

  } catch (error) {
    console.error('Error searching chats:', error);
    res.status(500).json({ message: 'Server error while searching chats.' });
  }
};


module.exports = {
  saveChat,
  getAllChats,
  getChatById,
  deleteAllChats,
  searchChats
};

