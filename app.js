const express = require('express');
const http = require('http');
const { Pool } = require('pg');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', async (socket) => {
  try {
    const res = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC');
    res.rows.forEach((row) => {
      socket.emit('message', row);
    });
  } catch (err) {
    console.error(err);
  }

  socket.on('message', async (message) => {
    const { sender, content, timestamp } = message;
    try {
      await pool.query(
        'INSERT INTO messages (sender, content, timestamp) VALUES ($1, $2, $3)',
        [sender, content, timestamp]
      );
      // Broadcast message to all clients
      io.emit('message', { sender, content, timestamp });
    } catch (err) {
      console.error(err);
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
