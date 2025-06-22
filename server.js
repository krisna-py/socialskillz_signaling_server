// signaling-server.js
// Node.js + Socket.IO WebRTC signaling server

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow from any origin (in dev)
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// Rooms map
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", () => {
    let roomFound = false;

    for (const roomId in rooms) {
      if (rooms[roomId].length === 1) {
        socket.join(roomId);
        rooms[roomId].push(socket.id);
        io.to(socket.id).emit("joined", { roomId, initiator: false });
        io.to(rooms[roomId][0]).emit("peer-joined", { peerId: socket.id });
        roomFound = true;
        break;
      }
    }

    if (!roomFound) {
      const roomId = socket.id;
      socket.join(roomId);
      rooms[roomId] = [socket.id];
      io.to(socket.id).emit("joined", { roomId, initiator: true });
    }
  });

  socket.on("signal", ({ roomId, data }) => {
    socket.to(roomId).emit("signal", { peerId: socket.id, data });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
      else io.to(rooms[roomId][0]).emit("peer-left", socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
