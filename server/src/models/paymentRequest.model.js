import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  payerAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
  },
  amount: {
    type: Number,
    required: true,
    min: [1, "Amount must be at least 1"],
  },
  description: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const PaymentRequest = mongoose.model("PaymentRequest", paymentRequestSchema);
