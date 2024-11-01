const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json()); // Parse JSON bodies

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/chatapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Track connected users
const users = {};

// Socket.io event handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// API endpoint to join a room
app.post('/api/join-room', async (req, res) => {
    const { username, roomName } = req.body;
    
    try {
        let room = await ChatRoom.findOne({ name: roomName });
        if (!room) {
            room = new ChatRoom({ name: roomName, users: [username] });
            await room.save();
        } else if (!room.users.includes(username)) {
            room.users.push(username);
            await room.save();
        }

        // Join the room on the Socket.IO server
        users[username] = roomName;
        io.to(roomName).emit('message', {
            username: 'Admin',
            text: `${username} has joined the room.`,
        });

        res.status(200).json({
            message: `Joined room: ${roomName}`,
            room: roomName,
            users: room.users,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to join room' });
    }
});

// API endpoint to send a chat message
app.post('/api/send-message', async (req, res) => {
    const { username, roomName, message } = req.body;
    
    try {
        const room = await ChatRoom.findOne({ name: roomName });
        if (!room) return res.status(404).json({ error: 'Room not found' });

        // Save the message to the database
        const newMessage = new Message({
            room: room._id,
            username,
            text: message,
        });
        await newMessage.save();

        // Broadcast the message to the room
        io.to(roomName).emit('message', { username, text: message });

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// API endpoint to retrieve chat history for a room
app.get('/api/room-history/:roomName', async (req, res) => {
    const { roomName } = req.params;
    
    try {
        const room = await ChatRoom.findOne({ name: roomName });
        if (!room) return res.status(404).json({ error: 'Room not found' });

        const messages = await Message.find({ room: room._id });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve room history' });
    }
});

// Join room and notify others
app.post('/api/join-room', async (req, res) => {
    const { username, roomName } = req.body;
    let room = await ChatRoom.findOne({ name: roomName });

    if (!room) {
        room = new ChatRoom({ name: roomName });
        await room.save();
    }

    io.to(roomName).emit('message', { username: 'Admin', text: `${username} has joined ${roomName}` });
    io.to(roomName).emit('roomData', { room: roomName, users: room.users });
    
    res.json({ room: roomName, users: room.users });
});

// Socket.IO integration for room communication
io.on('connection', (socket) => {
    socket.on('joinRoom', ({ username, roomName }) => {
        socket.join(roomName);
        io.to(roomName).emit('message', { username, text: `${username} joined ${roomName}` });
    });

    socket.on('chatMessage', ({ username, roomName, message }) => {
        io.to(roomName).emit('message', { username, text: message });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
