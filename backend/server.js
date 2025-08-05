const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    });
} else {
    // Development route
    app.get('/', (req, res) => {
        res.json({ message: 'WebRTC Server is running. React client should be running on port 3000.' });
    });
}

// Store room information
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room
    socket.on('join-room', (roomId, userId, username) => {
        socket.join(roomId);
        socket.userId = userId;
        socket.username = username;
        socket.roomId = roomId;

        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                users: new Map(),
                screenSharer: null
            });
        }

        const room = rooms.get(roomId);
        room.users.set(userId, {
            socketId: socket.id,
            username: username,
            isVideoEnabled: true,
            isAudioEnabled: true,
            isScreenSharing: false
        });

        // Notify other users in the room
        socket.to(roomId).emit('user-connected', userId, username);

        // Send current room state to new user
        const roomUsers = Array.from(room.users.entries()).map(([id, user]) => ({
            userId: id,
            username: user.username,
            isVideoEnabled: user.isVideoEnabled,
            isAudioEnabled: user.isAudioEnabled,
            isScreenSharing: user.isScreenSharing
        }));

        socket.emit('room-users', roomUsers, room.screenSharer);

        console.log(`User ${username} (${userId}) joined room ${roomId}`);
    });

    // Handle WebRTC signaling
    socket.on('offer', (offer, userId) => {
        socket.to(socket.roomId).emit('offer', offer, socket.userId);
    });

    socket.on('answer', (answer, userId) => {
        socket.to(socket.roomId).emit('answer', answer, socket.userId);
    });

    socket.on('ice-candidate', (candidate, userId) => {
        socket.to(socket.roomId).emit('ice-candidate', candidate, socket.userId);
    });

    // Handle media controls
    socket.on('toggle-video', (isEnabled) => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            const user = room.users.get(socket.userId);
            if (user) {
                user.isVideoEnabled = isEnabled;
                socket.to(socket.roomId).emit('user-video-toggle', socket.userId, isEnabled);
            }
        }
    });

    socket.on('toggle-audio', (isEnabled) => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            const user = room.users.get(socket.userId);
            if (user) {
                user.isAudioEnabled = isEnabled;
                socket.to(socket.roomId).emit('user-audio-toggle', socket.userId, isEnabled);
            }
        }
    });

    // Handle screen sharing
    socket.on('start-screen-share', () => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            
            // Only one user can share screen at a time
            if (room.screenSharer && room.screenSharer !== socket.userId) {
                socket.emit('screen-share-error', 'Another user is already sharing screen');
                return;
            }

            room.screenSharer = socket.userId;
            const user = room.users.get(socket.userId);
            if (user) {
                user.isScreenSharing = true;
            }

            socket.to(socket.roomId).emit('user-started-screen-share', socket.userId);
            console.log(`User ${socket.userId} started screen sharing in room ${socket.roomId}`);
        }
    });

    socket.on('stop-screen-share', () => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            
            if (room.screenSharer === socket.userId) {
                room.screenSharer = null;
                const user = room.users.get(socket.userId);
                if (user) {
                    user.isScreenSharing = false;
                }

                socket.to(socket.roomId).emit('user-stopped-screen-share', socket.userId);
                console.log(`User ${socket.userId} stopped screen sharing in room ${socket.roomId}`);
            }
        }
    });

    // Whiteboard collaboration handlers
    socket.on('whiteboard-draw', (data) => {
        if (socket.roomId) {
            // Broadcast drawing data to all other users in the room
            socket.to(socket.roomId).emit('whiteboard-draw', data);
        }
    });

    socket.on('join-whiteboard', (roomId) => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            console.log(`User ${socket.userId} joined whiteboard in room ${socket.roomId}`);
        }
    });

    socket.on('whiteboard-clear', (roomId) => {
        if (socket.roomId) {
            // Broadcast clear event to all users in the room
            socket.to(socket.roomId).emit('whiteboard-clear');
            console.log(`User ${socket.userId} cleared whiteboard in room ${socket.roomId}`);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.roomId && socket.userId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            
            // If user was screen sharing, stop it
            if (room.screenSharer === socket.userId) {
                room.screenSharer = null;
                socket.to(socket.roomId).emit('user-stopped-screen-share', socket.userId);
            }

            // Remove user from room
            room.users.delete(socket.userId);

            // Clean up empty rooms
            if (room.users.size === 0) {
                rooms.delete(socket.roomId);
            }

            // Notify other users
            socket.to(socket.roomId).emit('user-disconnected', socket.userId);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`WebRTC Server running on port ${PORT}`);
    console.log(`In development, React client should run on port 3000`);
});
