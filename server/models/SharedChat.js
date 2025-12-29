const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- Sub-Schemas ---
const SourceSchema = new Schema({
    title: { type: String },
    uri: { type: String },
    icon: { type: String },
    citationIndices: { type: [Number], default: [] }
}, { _id: false });

const ContentBlockSchema = new Schema({
    type: { type: String, required: true, enum: ['text', 'code', 'image', 'image_url', 'video', 'table'] },
    value: { type: Schema.Types.Mixed, required: true },
    language: String
}, { _id: false });

const MessageSchema = new Schema({
    _id: { type: String, required: true },
    
    // --- TREE STRUCTURE FIELDS ---
    parentMessageId: { type: String, default: null },
    childrenIds: { type: [String], default: [] },
    // -----------------------------

    sender: { type: String, required: true, enum: ['user', 'ai'] },
    content: [ContentBlockSchema],
    
    // UI States persisted
    status: { type: String, default: 'Completed' },
    reasoning: { type: [String], default: [] },
    sources: { type: [SourceSchema], default: [] }
}, { _id: false });

// --- Main Schema ---
const SharedChatSchema = new Schema({
  shareId: { type: String, required: true, unique: true, index: true },
  originalChatId: { type: String, required: true },
  originalUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Shared Chat' },
  
  messages: [MessageSchema], 
  
  // CRITICAL: Remembers which branch was active
  currentLeafId: { type: String, default: null },

  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }
});

module.exports = mongoose.model('SharedChat', SharedChatSchema);