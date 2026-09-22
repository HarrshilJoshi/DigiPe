import mongoose from "mongoose";

/**
 * Transaction Schema: Logs all ledger transfers between sender and receiver.
 * Stores transactional metadata, reference identifiers, linking ID to PaymentRequest,
 * and standard Razorpay checkout signature/order/payment trace fields for verification audit.
 */
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
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  metadata: {
    senderName: String,
    receiverName: String,
    senderAccountNumber: String,
    receiverAccountNumber: String,
  },
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true,
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  razorpaySignature: {
    type: String,
  },
  paymentRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PaymentRequest",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Transaction = mongoose.model("Transaction", transactionSchema);
