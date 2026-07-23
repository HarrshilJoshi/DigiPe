import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

// Load local .env if present, but preserve system/cloud process.env
dotenv.config({ path: "./src/config/.env" });
dotenv.config();

const PORT = process.env.PORT || 5000;
const DB_URI = process.env.DB_URI;
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

const userSockets = new Map();

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join", (userId) => {
    socket.join(String(userId));
    userSockets.set(String(userId), socket.id);
    console.log(`User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

export const sendLiveNotification = (userId, type, data) => {
  io.to(String(userId)).emit("notification:new", { type, ...data });
};

const startServer = async () => {
  try {
    if (DB_URI) {
      await mongoose.connect(DB_URI);
      console.log("DB connected successfully!");
    } else {
      console.warn("⚠️ Warning: DB_URI environment variable is missing!");
    }
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on 0.0.0.0:${PORT}`);
  });
};

startServer();

export default app;
