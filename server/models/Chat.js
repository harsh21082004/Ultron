const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContentBlockSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['text', 'code', 'image', 'image_url', 'video', 'table'] // Added image_url
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
    
    // NEW: Fields to persist the "Thinking" process
    status: { 
        type: String, 
        default: 'Completed' 
    },
    reasoning: {
        type: [String], // Array of strings for step-by-step logs
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