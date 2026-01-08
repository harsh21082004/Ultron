const { uploadBase64ToGCS } = require('../services/file-upload.service');

const processMessagesForSave = async (messages, userId) => {
  console.log(`[Processor] Scanning ${messages.length} messages for Base64 images...`);
  const processedMessages = [];

  for (const msg of messages) {
    // Clone message to avoid mutation issues
    const newMsg = { ...msg, content: [] };

    if (msg.content && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        const newBlock = { ...block };

        // CASE A: Block is ALREADY an 'image_url' with Base64 (e.g. User Upload)
        if ((block.type === 'image_url' || block.type === 'image') && block.value.startsWith('data:image')) {
          try {
            console.log(`[Processor] Uploading raw image block for User ${userId}...`);
            const url = await uploadBase64ToGCS(block.value, `chat-images/${userId}`);
            newBlock.value = url;
            newBlock.type = 'image_url'; 
          } catch (e) {
            console.error('[Processor] Failed to upload raw image block:', e);
          }
        } 
        
        // CASE B: Block is 'text' containing Markdown Image (e.g. Agent Generated)
        // Format: ![Generated Image](data:image/jpeg;base64,...)
        else if (block.type === 'text' && typeof block.value === 'string' && block.value.includes('data:image')) {
          let text = block.value.trim();
          
          // Regex to capture the Base64 string inside Markdown
          // Matches: ![Alt](data:image/...)
          const regex = /!\[.*?\]\((data:image\/.*?;base64,.*?)\)/;
          const match = regex.exec(text);

          if (match) {
            const base64Str = match[1];
            try {
              console.log(`[Processor] Converting Markdown Image to Image Block...`);
              const url = await uploadBase64ToGCS(base64Str, `generated/${userId}`);
              
              // TRANSFORM THE BLOCK: Text -> Image URL
              // This is crucial so the frontend renders it as an image, not markdown text.
              newBlock.type = 'image_url';
              newBlock.value = url;
              
              console.log(`[Processor] ✅ Converted to type: 'image_url'`);
            } catch (e) {
              console.error('[Processor] Failed to process markdown image:', e);
            }
          }
        }

        newMsg.content.push(newBlock);
      }
    }
    processedMessages.push(newMsg);
  }

  return processedMessages;
};

module.exports = { processMessagesForSave };