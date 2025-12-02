const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// This schema is correct.
const ContentBlockSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['text', 'code', 'image', 'video', 'table']
    },
    value: {
        type: Schema.Types.Mixed,
        required: true
    }
}, { _id: false });


// --- THIS IS THE FIX ---
const MessageSchema = new Schema({ 
    _id: { // 1. ADD this field
        type: String, // 2. Set type to String
        required: true,
    },
    sender: {
        type: String,
        required: true,
        enum: ['user', 'ai']
    },
    content: [ContentBlockSchema]
}, { 
    timestamps: true,
    // _id: false // 3. REMOVE this line
});
// --- END OF FIX ---


const ChatSchema = new Schema({
    _id: {
        type: String, // This is correct (for the Chat ID)
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
    messages: [MessageSchema] // This will now use the corrected MessageSchema
}, { 
    timestamps: true,
    versionKey: false 
});

module.exports = mongoose.model('Chat', ChatSchema);
