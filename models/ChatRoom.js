// models/ChatRoom.js
const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    users: [{ type: String }], // store usernames or user IDs
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
