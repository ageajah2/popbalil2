const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// --- DATABASE HELPER ---
function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        return { players: {} };
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.static(__dirname)); // Serve HTML, CSS, JS from root

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send initial leaderboard
    const db = readDB();
    socket.emit('leaderboardUpdate', db.players);

    // Handle user login/init
    socket.on('initUser', (username) => {
        socket.username = username;
        const db = readDB();
        const score = db.players[username] ? db.players[username].score : 0;
        socket.emit('userScore', score);
    });

    // Handle pop event
    socket.on('pop', (username) => {
        if (!username) return;

        let db = readDB();
        if (!db.players[username]) {
            db.players[username] = { score: 0 };
        }
        db.players[username].score += 1;
        writeDB(db);

        // Broadcast update to everyone
        io.emit('leaderboardUpdate', db.players);
        // Specifically confirm back to the user (optional, but good for sync)
        socket.emit('userScore', db.players[username].score);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
