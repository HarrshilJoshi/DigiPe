import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  senderAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  receiverAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [1, "Amount cannot be less than 1"],
  },
  description: {
    type: String,
    maxlength: [20, "Description too long (max 20 characters)"],
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "reversed"],
    default: "pending",
  },
  referenceId: {
    type: String,
    unique: true,
  },
  metadata: {
    senderName: String,
    receiverName: String,
    senderAccountNumber: String,
    receiverAccountNumber: String,
  },
  createdAt: {
    type: Date,
    date: Date.now,
  },
});

export const Transaction = mongoose.model("Transaction", transactionSchema);
