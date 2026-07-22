import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User reference is required"],
  },
  accountNumber: {
    type: String,
    required: [true, "Account Number is required"],
    unique: true,
    minLength: [10, "Account Number must be atleast 10 digits"],
  },
  ifsc: {
    type: String,
    required: [true, "IFSC code is required"],
    uppercase: true,
  },
  bankName: {
    type: String,
    required: [true, "Bank Name is required"],
    trim: true,
  },
  balance: {
    type: Number,
    required: true,
    min: [0, "Balance cannot be negative"],
    default: 10000,
  },
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
  ],
});

export const Account = mongoose.model("Account", accountSchema);
