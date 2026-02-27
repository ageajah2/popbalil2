# Pop Balil 2 - Node.js Version

This version of the game has been migrated from Firebase to a Node.js backend.

## Features
- **Express Backend**: Serves the game files and handled API logic.
- **Socket.io**: Replaces Firebase Realtime Database for real-time score updates and leaderboard.
- **Local Persistence**: Stores scores in a `database.json` file.

## How to Run

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Open your terminal in this folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser and go to:
   [http://localhost:3000](http://localhost:3000)

## Files
- `server.js`: The Node.js server.
- `database.json`: Where player data is stored (created automatically).
- `index.html`, `style.css`, `script.js`: Updated frontend files.
