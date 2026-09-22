import mongoose from "mongoose";

/**
 * Notification Schema: Stores user notifications for alerts (transactions, security alerts, system messages).
 */
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["transaction", "security", "promotion", "system"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
});

export const Notification = mongoose.model("Notification", notificationSchema);
