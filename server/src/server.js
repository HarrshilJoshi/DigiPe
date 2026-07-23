import "dotenv/config";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Load local config .env if present
dotenv.config({ path: "./src/config/.env" });

// Import app after environment variables are initialized
import app from "./app.js";

console.log("🚀 Initializing DigiPe Server...");

// Global uncaught error handlers to prevent process exit in cloud hosting
process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err.stack || err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason);
});

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

// Socket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    console.warn("Socket JWT verification note:", err.message);
    next();
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Automatically join private user room if socket is authenticated via JWT
  if (socket.userId) {
    const userIdStr = String(socket.userId);
    socket.join(userIdStr);
    userSockets.set(userIdStr, socket.id);
    console.log(`Authenticated user ${userIdStr} joined socket room`);
  }

  socket.on("join", (userId) => {
    const targetUserId = socket.userId ? String(socket.userId) : String(userId);
    socket.join(targetUserId);
    userSockets.set(targetUserId, socket.id);
    console.log(`User ${targetUserId} joined room`);
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
  console.log(`⚡ DigiPe server listening on 0.0.0.0:${PORT}`);
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
