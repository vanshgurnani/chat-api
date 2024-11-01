// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    username: { type: String, required: true }, // or user ID if you use an authentication system
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
