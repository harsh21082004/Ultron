const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
    
    // --- TREE STRUCTURE ---
    // Points to the message before this one
    parentMessageId: { type: String, default: null },
    // Points to replies/edits (branches)
    childrenIds: { type: [String], default: [] },
    // ----------------------

    sender: { type: String, required: true, enum: ['user', 'ai'] },
    content: [ContentBlockSchema],
    status: { type: String, default: 'Completed' },
    reasoning: { type: [String], default: [] },
    sources: { type: [SourceSchema], default: [] }
}, { _id: false });

const ChatSchema = new Schema({
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    
    // Stores EVERY message node (1, 2, 3v1, 3v2, 4, 5, 4new)
    messages: [MessageSchema],

    // Stores the ID of the very last message in the currently visible branch
    // e.g., Message 5 OR Message 4(new)
    currentLeafId: { type: String, default: null }
}, { 
    timestamps: true,
    versionKey: false 
});

module.exports = mongoose.model('Chat', ChatSchema);