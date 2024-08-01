const express = require('express');
const { Server } = require('ws');
const { Pool } = require('pg');
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

const wss = new Server({ noServer: true });
 
wss.on('connection', async (ws) => {
  try {
    const res = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC');
    res.rows.forEach((row) => {
      ws.send(JSON.stringify(row));
    });
  } catch (err) {
    console.error(err);
  }

  ws.on('message', async (message) => {
    const { sender, content, timestamp } = JSON.parse(message);
    try {
      await pool.query(
        'INSERT INTO messages (sender, content, timestamp) VALUES ($1, $2, $3)',
        [sender, content, timestamp]
      );
    } catch (err) {
      console.error(err);
    }

    // Broadcast message to all clients
    const outgoingMessage = JSON.stringify({ sender, content, timestamp });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(outgoingMessage);
      }
    });
  });
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
