import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

dotenv.config({ path: "./src/config/.env" });

const PORT = process.env.PORT || 5000;
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

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.DB_URI);
    isConnected = true;
    console.log("DB connected successfully!");
  } catch (error) {
    console.error(`MongoDB connection failed ${error.message}`);
  } finally {
    server.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
  }
};

connectDB();

export default app;
