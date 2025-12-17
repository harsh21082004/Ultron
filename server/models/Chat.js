const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- 1. NEW SOURCE SCHEMA ---
const SourceSchema = new Schema({
    title: { type: String },
    uri: { type: String },
    icon: { type: String },
    // Optional: stores which sentence indices correlate to this source for inline citations
    citationIndices: { type: [Number], default: [] } 
}, { _id: false });

const ContentBlockSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['text', 'code', 'image', 'image_url', 'video', 'table']
    },
    value: {
        type: Schema.Types.Mixed,
        required: true
    },
    language: String
}, { _id: false });

const MessageSchema = new Schema({ 
    _id: { 
        type: String, 
        required: true,
    },
    sender: {
        type: String,
        required: true,
        enum: ['user', 'ai']
    },
    content: [ContentBlockSchema],
    
    // Fields to persist the "Thinking" process
    status: { 
        type: String, 
        default: 'Completed' 
    },
    reasoning: {
        type: [String], 
        default: []
    },
    // --- 2. ADDED SOURCES FIELD ---
    sources: {
        type: [SourceSchema],
        default: []
    }
}, { 
    timestamps: true,
});

const ChatSchema = new Schema({
    _id: {
        type: String,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    messages: [MessageSchema]
}, { 
    timestamps: true,
    versionKey: false 
});

module.exports = mongoose.model('Chat', ChatSchema);