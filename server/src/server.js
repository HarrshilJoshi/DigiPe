import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

// Global uncaught error handlers to prevent process exit in cloud hosting
process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason);
});

// Load local .env if present, but preserve system/cloud process.env
dotenv.config({ path: "./src/config/.env" });
dotenv.config();

const PORT = process.env.PORT || 5000;
const DB_URI = process.env.DB_URI ? process.env.DB_URI.replace(/^["']|["']$/g, "").trim() : "";
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

// 1. Start HTTP server IMMEDIATELY so Render health check passes instantly
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 DigiPe server listening on port: ${PORT}`);
});

// 2. Connect MongoDB asynchronously in background
if (DB_URI) {
  mongoose
    .connect(DB_URI)
    .then(() => console.log("⚡ MongoDB connected successfully!"))
    .catch((err) => console.error(`⚠️ MongoDB connection error: ${err.message}`));
} else {
  console.warn("⚠️ Warning: DB_URI environment variable is missing!");
}

export default app;
