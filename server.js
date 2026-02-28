const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

const PORT = process.env.PORT || 3000;

// --- DATABASE SETUP ---
// Connect to the DB using DATABASE_URL (usually provided by Railway)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:MKgRApBNdedrNFodHUpmnWAmAzXPJdwT@postgres.railway.internal:5432/railway',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Initialize database table if it doesn't exist
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS players (
                username VARCHAR(50) PRIMARY KEY,
                score INTEGER DEFAULT 0
            )
        `);
        console.log('Database table "players" is ready.');
    } catch (err) {
        console.error('Error initializing database at startup:', err);
    }
}
initDB();

// Fetch all players to format leaderboard
async function getAllPlayers() {
    try {
        const res = await pool.query('SELECT username, score FROM players ORDER BY score DESC');
        const playersObj = {};
        res.rows.forEach(row => {
            playersObj[row.username] = { score: row.score };
        });
        return playersObj;
    } catch (err) {
        console.error('Error fetching players:', err);
        return {};
    }
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.static(__dirname)); // Serve HTML, CSS, JS from root

// --- SOCKET.IO ---
io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id);

    // Send initial leaderboard
    const allPlayers = await getAllPlayers();
    socket.emit('leaderboardUpdate', allPlayers);

    // Handle user login/init
    socket.on('initUser', async (username) => {
        socket.username = username;
        try {
            // Check if user exists
            const res = await pool.query('SELECT score FROM players WHERE username = $1', [username]);

            let score = 0;
            if (res.rows.length > 0) {
                // User exists
                score = res.rows[0].score;
            } else {
                // New user
                await pool.query('INSERT INTO players (username, score) VALUES ($1, $2)', [username, 0]);
            }

            // Send initial score to the newly connected user
            socket.emit('userScore', score);

            // Broadcast new user to all
            const updatedLeaderboard = await getAllPlayers();
            io.emit('leaderboardUpdate', updatedLeaderboard);
        } catch (err) {
            console.error('Error in initUser:', err);
        }
    });

    // Handle pop event
    socket.on('pop', async (username) => {
        if (!username) return;

        try {
            // Increment logic atomically to prevent race conditions
            const updateRes = await pool.query(
                'UPDATE players SET score = score + 1 WHERE username = $1 RETURNING score',
                [username]
            );

            let newScore = 1;
            if (updateRes.rows.length > 0) {
                newScore = updateRes.rows[0].score;
            } else {
                // Failsafe: if somehow user popped before initialization
                await pool.query('INSERT INTO players (username, score) VALUES ($1, $2)', [username, 1]);
            }

            // Immediately send back updated score to the user clicking
            socket.emit('userScore', newScore);

            // Update leaderboard for everyone
            const updatedLeaderboard = await getAllPlayers();
            io.emit('leaderboardUpdate', updatedLeaderboard);
        } catch (err) {
            console.error('Error in pop:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
