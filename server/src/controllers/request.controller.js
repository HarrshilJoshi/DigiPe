import mongoose from "mongoose";
import { PaymentRequest } from "../models/paymentRequest.model.js";
import { User } from "../models/user.model.js";
import { Account } from "../models/account.model.js";
import { Transaction } from "../models/transaction.model.js";
import { checkMpinLockout, recordMpinFailure, resetMpinAttempts } from "../config/redis.config.js";

/**
 * Create a new payment request from current user (requester) to another account (payer).
 * Emits a real-time socket notification to the payer if connected.
 */
export const createPaymentRequest = async (req, res) => {
  try {
    const { toAccountNumber, amount, description } = req.body;
    const requesterId = req.userId;

    if (!toAccountNumber || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    const payerAccount = await Account.findOne({ accountNumber: String(toAccountNumber) });
    if (!payerAccount) {
      return res.status(404).json({ message: "Target account not found" });
    }

    if (String(payerAccount.user) === String(requesterId)) {
      return res.status(400).json({ message: "You cannot request money from yourself" });
    }

    const requester = await User.findById(requesterId);

    const paymentRequest = await PaymentRequest.create({
      requester: requesterId,
      payer: payerAccount.user,
      payerAccount: payerAccount._id,
      amount: Number(amount),
      description: description || "Payment request",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(String(payerAccount.user)).emit("notification:new", {
        type: "request_received",
        title: "Payment Requested",
        message: `${requester.firstname} ${requester.lastname} requested ₹${amount}`,
      });
    }

    res.status(201).json({ message: "Payment request sent", paymentRequest });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Retrieve all payment requests associated with the authenticated user:
 * - "received": pending requests sent to this user by others.
 * - "sent": all requests created by this user.
 */
export const getMyRequests = async (req, res) => {
  try {
    const userId = req.userId;
    const received = await PaymentRequest.find({ payer: userId, status: "pending" })
      .populate("requester", "firstname lastname email")
      .populate("payerAccount", "accountNumber bankName")
      .lean();

    const sent = await PaymentRequest.find({ requester: userId })
      .populate("payer", "firstname lastname email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      received: received.map((r) => ({
        id: r._id,
        amount: r.amount,
        description: r.description,
        status: r.status,
        requesterName: `${r.requester?.firstname} ${r.requester?.lastname}`,
        requesterEmail: r.requester?.email,
        payerAccountNumber: r.payerAccount?.accountNumber,
        createdAt: r.createdAt,
      })),
      sent: sent.map((s) => ({
        id: s._id,
        amount: s.amount,
        description: s.description,
        status: s.status,
        payerName: `${s.payer?.firstname} ${s.payer?.lastname}`,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Helper: Processes the actual payment deduction, balance update, status transition, 
 * security MPIN verification, and creates the transaction audit log.
 * Supports optional MongoDB replica-set sessions.
 */
const executeApproval = async (userId, requestObj, payerAccount, requesterAccount, mpin, session) => {
  // Validate MPIN
  const payerUser = session
    ? await User.findById(userId).session(session)
    : await User.findById(userId);

  if (!payerUser.mpin_hash) {
    const err = new Error("Transaction PIN has not been set. Please set your MPIN in Security Settings.");
    err.statusCode = 400;
    throw err;
  }
  if (!mpin) {
    const err = new Error("Security MPIN is required");
    err.statusCode = 400;
    throw err;
  }

  // 1. Check if user is locked out before running bcrypt
  const lockStatus = await checkMpinLockout(userId);
  if (lockStatus.locked) {
    const err = new Error("Account locked: Maximum 3 incorrect MPIN attempts reached. Transfers are frozen for 24 hours. Reset your PIN in Security Settings to unlock.");
    err.statusCode = 423;
    err.isLocked = true;
    throw err;
  }

  // 2. Validate MPIN with bcrypt
  const isMpinValid = await payerUser.validateMpin(String(mpin));
  if (!isMpinValid) {
    const failureStatus = await recordMpinFailure(userId);
    if (failureStatus.locked) {
      const err = new Error("Security alert: 3 consecutive incorrect MPIN attempts. Your account is now locked for 24 hours. Reset your PIN in Security Settings to unlock.");
      err.statusCode = 423;
      err.isLocked = true;
      throw err;
    }
    const err = new Error(`Incorrect Security MPIN. ${failureStatus.remainingAttempts} attempt(s) remaining before account lockout.`);
    err.statusCode = 400;
    err.remainingAttempts = failureStatus.remainingAttempts;
    throw err;
  }

  // 3. Reset failed attempts counter on valid MPIN
  await resetMpinAttempts(userId);

  // Atomic conditional deduction directly in database engine
  const updatePayerOpts = { new: true };
  if (session) updatePayerOpts.session = session;

  const updatedPayerAccount = await Account.findOneAndUpdate(
    {
      _id: payerAccount._id,
      balance: { $gte: requestObj.amount }, // Invariant check inside DB engine
    },
    {
      $inc: { balance: -requestObj.amount }, // Atomic decrement
    },
    updatePayerOpts
  );

  if (!updatedPayerAccount) {
    throw new Error("Insufficient balance to satisfy request");
  }

  // Atomic credit to requester account
  const updateRequesterOpts = { new: true };
  if (session) updateRequesterOpts.session = session;

  const updatedRequesterAccount = await Account.findOneAndUpdate(
    { _id: requesterAccount._id },
    { $inc: { balance: requestObj.amount } }, // Atomic increment
    updateRequesterOpts
  );

  if (!updatedRequesterAccount) {
    if (!session) {
      await Account.findByIdAndUpdate(payerAccount._id, { $inc: { balance: requestObj.amount } });
    }
    throw new Error("Requester account could not be credited");
  }

  requestObj.status = "accepted";
  if (session) {
    await requestObj.save({ session });
  } else {
    await requestObj.save();
  }

  const txnData = {
    senderAccount: updatedPayerAccount._id,
    receiverAccount: updatedRequesterAccount._id,
    amount: requestObj.amount,
    description: requestObj.description || "Request payment",
    status: "completed",
    referenceId: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    metadata: {
      senderName: `${requestObj.payer.firstname} ${requestObj.payer.lastname}`,
      receiverName: `${requestObj.requester.firstname} ${requestObj.requester.lastname}`,
      senderAccountNumber: updatedPayerAccount.accountNumber,
      receiverAccountNumber: updatedRequesterAccount.accountNumber,
    },
  };

  const transaction = session
    ? await Transaction.create([txnData], { session, ordered: true })
    : [await Transaction.create(txnData)];

  return { transaction };
};

/**
 * Responds to a payment request.
 * - If declined: Updates request status to 'declined' and notifies the requester.
 * - If approved: Performs balance checks, updates balances, and creates a transaction record.
 *   Uses a MongoDB transaction session with a fallback to standalone mode if replica sets are unsupported.
 */
export const respondToRequest = async (req, res) => {
  try {
    const { requestId, accept } = req.body;
    const mpin = req.headers["x-mpin"] || req.body.mpin;
    const userId = req.userId;

    const requestObj = await PaymentRequest.findById(requestId)
      .populate("requester")
      .populate("payer");

    if (!requestObj) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (String(requestObj.payer._id) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized to respond to this request" });
    }

    if (requestObj.status !== "pending") {
      return res.status(400).json({ message: "Request has already been processed" });
    }

    const io = req.app.get("io");

    if (!accept) {
      requestObj.status = "declined";
      await requestObj.save();

      if (io) {
        io.to(String(requestObj.requester._id)).emit("notification:new", {
          type: "request_declined",
          title: "Request Declined",
          message: `${requestObj.payer.firstname} ${requestObj.payer.lastname} declined your request for ₹${requestObj.amount}`,
        });
      }

      return res.status(200).json({ message: "Request declined" });
    }

    // Execute transfer from Payer to Requester
    const payerAccount = await Account.findOne({ user: userId });
    const requesterAccount = await Account.findOne({ user: requestObj.requester._id });

    if (!payerAccount || !requesterAccount) {
      return res.status(400).json({ message: "Account setup incomplete" });
    }

    let session = null;
    try {
      // Step A: Attempt standard MongoDB multi-document ACID transaction
      session = await mongoose.startSession();
      session.startTransaction();

      const payerAccountTx = await Account.findOne({ user: userId }).session(session);
      const requesterAccountTx = await Account.findOne({ user: requestObj.requester._id }).session(session);
      const requestObjTx = await PaymentRequest.findById(requestId).populate("requester").populate("payer").session(session);

      await executeApproval(userId, requestObjTx, payerAccountTx, requesterAccountTx, mpin, session);

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      if (session) {
        try {
          await session.abortTransaction();
          session.endSession();
        } catch (e) { }
      }

      const errStr = err.message || "";
      // Step B: Fallback: If MongoDB runs in local standalone mode without replica-sets, retry without transactions
      if (errStr.includes("Transaction numbers are only allowed") || errStr.includes("replica set") || errStr.includes("sessions are not supported")) {
        console.log("MongoDB is standalone (replica sets not supported). Retrying request approval without session context...");
        try {
          await executeApproval(userId, requestObj, payerAccount, requesterAccount, mpin, null);
        } catch (retryErr) {
          console.error(`Retry Failed ${retryErr}`);
          return res.status(retryErr.statusCode || 400).json({
            message: retryErr.message || "Approval failed",
            isLocked: retryErr.isLocked || false,
            remainingAttempts: retryErr.remainingAttempts,
          });
        }
      } else {
        console.error(`Approval Failed ${err}`);
        return res.status(err.statusCode || 400).json({
          message: err.message || "Approval failed",
          isLocked: err.isLocked || false,
          remainingAttempts: err.remainingAttempts,
        });
      }
    }

    if (io) {
      io.to(String(requestObj.requester._id)).emit("notification:new", {
        type: "request_accepted",
        title: "Request Approved",
        message: `${requestObj.payer.firstname} ${requestObj.payer.lastname} approved and sent you ₹${requestObj.amount}`,
      });
    }

    res.status(200).json({ message: "Payment request approved and transferred" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
