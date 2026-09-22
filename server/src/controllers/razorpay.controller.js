import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import { Transaction } from "../models/transaction.model.js";
import { Account } from "../models/account.model.js";
import { User } from "../models/user.model.js";
import { PaymentRequest } from "../models/paymentRequest.model.js";
import { Notification } from "../models/notification.model.js";

let razorpayInstance = null;
const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error("Razorpay API Key ID and Key Secret must be configured in environment variables.");
    }
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayInstance;
};

/**
 * Stage 2: Create a Razorpay Order for a Direct Fund Transfer
 * Validates inputs, checks sender & receiver details, validates MPIN, checks balance,
 * creates the Razorpay Order, and stores a pending transaction.
 */
export const createOrder = async (req, res) => {
  try {
    const { toAccountNumber, ifsc, firstname, lastname, amount, description } = req.body;
    const accountNumber = req.headers["account-number"];
    const mpin = req.headers["x-mpin"] || req.body.mpin;
    const userId = req.userId;

    // 1. Basic validation
    if (!toAccountNumber || !ifsc || !firstname || !lastname || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid transaction details" });
    }

    // 2. Fetch sender account
    const senderAccount = await Account.findOne({ accountNumber });
    if (!senderAccount) {
      return res.status(404).json({ message: "No primary account found for sender" });
    }

    // Verify sender ownership
    if (String(senderAccount.user) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized account ownership" });
    }

    // 3. Fetch receiver account
    const code = ifsc.toUpperCase();
    const receiverAccount = await Account.findOne({
      accountNumber: String(toAccountNumber),
      ifsc: code,
    }).populate("user");

    if (!receiverAccount) {
      return res.status(404).json({ message: "Recipient not found or details mismatch" });
    }

    // 4. Fetch users
    const receiverUser = receiverAccount.user;
    const senderUser = await User.findById(userId);

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: "User accounts not found" });
    }

    // 5. Verify receiver name matches
    if (
      receiverUser.firstname.toLowerCase() !== firstname.toLowerCase() ||
      receiverUser.lastname.toLowerCase() !== lastname.toLowerCase()
    ) {
      return res.status(400).json({ message: "Receiver's name doesn't match account details" });
    }

    // 6. Validate MPIN
    if (!senderUser.mpin_hash) {
      return res.status(400).json({
        message: "Transaction PIN has not been set. Please set your MPIN in Security Settings.",
      });
    }
    if (!mpin) {
      return res.status(400).json({ message: "Security MPIN is required" });
    }
    const isMpinValid = await senderUser.validateMpin(String(mpin));
    if (!isMpinValid) {
      return res.status(400).json({ message: "Incorrect Security MPIN" });
    }

    // 7. Check balance sufficiency
    if (senderAccount.balance < amount) {
      return res.status(400).json({ message: "Insufficient Funds!" });
    }

    // 8. Create Razorpay order
    const orderOptions = {
      amount: Math.round(amount * 100), // convert to paise (smallest unit)
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    let razorpayOrder;
    try {
      razorpayOrder = await getRazorpayInstance().orders.create(orderOptions);
    } catch (rzpErr) {
      console.error("Razorpay order creation API failure:", rzpErr);
      return res.status(502).json({ message: "Failed to initialize payment gateway order" });
    }

    // 9. Store the pending transaction record in database
    const referenceId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const txnData = {
      senderAccount: senderAccount._id,
      receiverAccount: receiverAccount._id,
      amount: amount,
      description: description || `Transfer to ${receiverUser.firstname} ${receiverUser.lastname}`,
      status: "pending",
      referenceId: referenceId,
      razorpayOrderId: razorpayOrder.id,
      metadata: {
        senderName: `${senderUser.firstname} ${senderUser.lastname}`,
        receiverName: `${receiverUser.firstname} ${receiverUser.lastname}`,
        senderAccountNumber: senderAccount.accountNumber,
        receiverAccountNumber: receiverAccount.accountNumber,
      },
    };

    const transaction = await Transaction.create(txnData);

    // 10. Return public checkout options (secrets remain on server)
    return res.status(201).json({
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      transactionId: transaction._id,
      sender: {
        name: `${senderUser.firstname} ${senderUser.lastname}`,
        email: senderUser.email,
        phone: senderUser.phone || "",
      },
      payerBankName: senderAccount.bankName,
    });
  } catch (err) {
    console.error("Error creating direct transfer order:", err);
    return res.status(500).json({ message: "Internal server error during order creation" });
  }
};

/**
 * Stage 2: Create a Razorpay Order for a Payment Request Approval
 * Validates request, checks MPIN, checks payer balance, creates the Razorpay Order,
 * and stores a pending transaction linked to the PaymentRequest.
 */
export const createPaymentRequestOrder = async (req, res) => {
  try {
    const { requestId } = req.body;
    const mpin = req.headers["x-mpin"] || req.body.mpin;
    const userId = req.userId;

    // 1. Basic validation
    if (!requestId) {
      return res.status(400).json({ message: "Request ID is required" });
    }

    // 2. Fetch payment request
    const requestObj = await PaymentRequest.findById(requestId)
      .populate("requester")
      .populate("payer");

    if (!requestObj) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    // Verify transaction ownership
    if (String(requestObj.payer._id) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized to pay this request" });
    }

    if (requestObj.status !== "pending") {
      return res.status(400).json({ message: "Payment request has already been processed" });
    }

    // 3. Fetch payer & requester accounts
    const payerAccount = await Account.findOne({ user: userId });
    const requesterAccount = await Account.findOne({ user: requestObj.requester._id });

    if (!payerAccount || !requesterAccount) {
      return res.status(400).json({ message: "Account setup incomplete" });
    }

    // 4. Validate MPIN
    const payerUser = requestObj.payer;
    if (!payerUser.mpin_hash) {
      return res.status(400).json({
        message: "Transaction PIN has not been set. Please set your MPIN in Security Settings.",
      });
    }
    if (!mpin) {
      return res.status(400).json({ message: "Security MPIN is required" });
    }
    const isMpinValid = await payerUser.validateMpin(String(mpin));
    if (!isMpinValid) {
      return res.status(400).json({ message: "Incorrect Security MPIN" });
    }

    // 5. Check balance sufficiency
    if (payerAccount.balance < requestObj.amount) {
      return res.status(400).json({ message: "Insufficient balance to satisfy request" });
    }

    // 6. Create Razorpay order
    const orderOptions = {
      amount: Math.round(requestObj.amount * 100), // convert to paise (smallest unit)
      currency: "INR",
      receipt: `rcpt_req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    let razorpayOrder;
    try {
      razorpayOrder = await getRazorpayInstance().orders.create(orderOptions);
    } catch (rzpErr) {
      console.error("Razorpay order creation API failure for request:", rzpErr);
      return res.status(502).json({ message: "Failed to initialize payment gateway order" });
    }

    // 7. Store the pending transaction record linked to payment request
    const referenceId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const txnData = {
      senderAccount: payerAccount._id,
      receiverAccount: requesterAccount._id,
      amount: requestObj.amount,
      description: requestObj.description || "Request payment",
      status: "pending",
      referenceId: referenceId,
      razorpayOrderId: razorpayOrder.id,
      paymentRequestId: requestObj._id,
      metadata: {
        senderName: `${payerUser.firstname} ${payerUser.lastname}`,
        receiverName: `${requestObj.requester.firstname} ${requestObj.requester.lastname}`,
        senderAccountNumber: payerAccount.accountNumber,
        receiverAccountNumber: requesterAccount.accountNumber,
      },
    };

    const transaction = await Transaction.create(txnData);

    // 8. Return public checkout options
    return res.status(201).json({
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      transactionId: transaction._id,
      sender: {
        name: `${payerUser.firstname} ${payerUser.lastname}`,
        email: payerUser.email,
        phone: payerUser.phone || "",
      },
      payerBankName: payerAccount.bankName,
    });
  } catch (err) {
    console.error("Error creating payment request order:", err);
    return res.status(500).json({ message: "Internal server error during order creation" });
  }
};



/**
 * Stage 5: Atomic DigiPe Payment Completion Helper
 * Executes the entire balance transfers, transaction status changes, database notifications,
 * and related PaymentRequest updates inside a single strict MongoDB session transaction.
 * Operates with database-level deduplication / idempotency (status: "pending").
 * Post-commit tasks (Socket.io notification, Redis cache eviction) are executed only after successful commit.
 */
export const completePaymentHelper = async (transactionId, razorpayPaymentId, razorpaySignature, appIo) => {
  let attempts = 3;
  while (attempts > 0) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 1. Retrieve the transaction with session
      const transaction = await Transaction.findById(transactionId)
        .populate("senderAccount receiverAccount")
        .session(session);

      if (!transaction) {
        throw new Error("Transaction record not found inside session");
      }

      // 2. Check if the transaction is already completed (idempotency check)
      if (transaction.status === "completed") {
        await session.commitTransaction();
        return { transaction, alreadyCompleted: true };
      }

      if (transaction.status !== "pending" && transaction.status !== "failed") {
        throw new Error(`Transaction cannot be completed. Current status: ${transaction.status}`);
      }

      // 3. Find accounts with session to perform balance changes
      const senderAccount = await Account.findById(transaction.senderAccount._id).session(session);
      const receiverAccount = await Account.findById(transaction.receiverAccount._id).session(session);

      if (!senderAccount || !receiverAccount) {
        throw new Error("Accounts involved in the transaction could not be located in session");
      }

      // 4. Re-check the CURRENT sender balance before deducting money
      if (senderAccount.balance < transaction.amount) {
        throw new Error("Insufficient balance at transaction execution time");
      }

      // 5. Deduct sender and credit receiver
      senderAccount.balance -= transaction.amount;
      receiverAccount.balance += transaction.amount;

      await senderAccount.save({ session });
      await receiverAccount.save({ session });

      // 6. Update the transaction status and save Razorpay tracking details
      transaction.status = "completed";
      transaction.razorpayPaymentId = razorpayPaymentId;
      transaction.razorpaySignature = razorpaySignature;
      await transaction.save({ session });

      // 7. If linked to a PaymentRequest, update the request status to "accepted"
      let paymentRequest = null;
      if (transaction.paymentRequestId) {
        paymentRequest = await PaymentRequest.findById(transaction.paymentRequestId).session(session);
        if (paymentRequest) {
          if (paymentRequest.status !== "pending") {
            throw new Error("Payment request has already been processed");
          }
          paymentRequest.status = "accepted";
          await paymentRequest.save({ session });
        } else {
          throw new Error("Payment request linked to this transaction was not found");
        }
      }

      // 8. Create internal database notifications inside session
      const senderUser = await User.findById(senderAccount.user).session(session);
      const receiverUser = await User.findById(receiverAccount.user).session(session);

      if (senderUser && receiverUser) {
        const notifData = [
          {
            user: senderUser._id,
            type: "transaction",
            title: "Funds Sent",
            message: `You sent ₹${transaction.amount} to ${receiverUser.firstname} ${receiverUser.lastname}`,
          },
          {
            user: receiverUser._id,
            type: "transaction",
            title: "Funds Received",
            message: `You received ₹${transaction.amount} from ${senderUser.firstname} ${senderUser.lastname}`,
          },
        ];
        await Notification.create(notifData, { session, ordered: true });
      }

      // Commit transaction atomically
      await session.commitTransaction();

      // 9. Post-Commit Actions (Only runs if transaction successfully commits)
      const postCommitActions = async () => {
        try {
          // A. Emit Socket.io real-time notifications
          if (appIo && senderUser && receiverUser) {
            appIo.to(String(senderUser._id)).emit("notification:new", {
              type: "transfer_sent",
              title: "Funds Sent",
              message: `You sent ₹${transaction.amount} to ${receiverUser.firstname} ${receiverUser.lastname}`,
            });
            appIo.to(String(receiverUser._id)).emit("notification:new", {
              type: "transfer_received",
              title: "Funds Received",
              message: `You received ₹${transaction.amount} from ${senderUser.firstname} ${senderUser.lastname}`,
            });
          }

          // B. Clear Redis caches
          try {
            const { delCache, flushPattern } = await import("../config/redis.config.js");
            await delCache(`user:profile:${senderAccount.user}`);
            await delCache(`user:profile:${receiverAccount.user}`);
            await flushPattern("search:*");
          } catch (redisErr) {
            console.error("Cache clearance error post-commit:", redisErr);
          }
        } catch (postErr) {
          console.error("Error in post-commit triggers:", postErr);
        }
      };
      
      postCommitActions();

      return { transaction, alreadyCompleted: false };
    } catch (error) {
      await session.abortTransaction();
      
      const isTransient = error.errorLabels && error.errorLabels.includes("TransientTransactionError");
      const isWriteConflict = error.code === 112 || error.message.includes("WriteConflict") || isTransient;
      
      if (isWriteConflict && attempts > 1) {
        attempts--;
        console.warn(`Write conflict encountered. Retrying transaction completion... Attempts left: ${attempts}`);
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      console.error("MongoDB session transaction aborted:", error.message);
      throw error;
    } finally {
      await session.endSession();
    }
  }
};

/**
 * Stage 4 & 5: Cryptographically verify the payment signature from the frontend
 * Checks transaction existence, state, ownership, order ID alignment, and signature authenticity.
 * If valid, triggers completePaymentHelper to execute the balance transfer inside a session transaction.
 */
export const verifyPayment = async (req, res) => {
  try {
    const { transactionId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.userId;

    // 1. Validate inputs
    if (!transactionId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing required payment verification details" });
    }

    // 2. Fetch transaction and populate accounts to check user ownership
    const transaction = await Transaction.findById(transactionId).populate("senderAccount receiverAccount");
    if (!transaction) {
      return res.status(404).json({ message: "Transaction record not found" });
    }

    // 3. Verify transaction ownership: sender must be the authenticated user
    if (String(transaction.senderAccount.user) !== String(userId)) {
      return res.status(403).json({ message: "Unauthorized access: Transaction does not belong to you" });
    }

    // 4. Verify Razorpay order ID matches database stored order ID
    if (transaction.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: "Razorpay order ID mismatch" });
    }

    // 5. Handle duplicate verification / idempotency
    if (transaction.status === "completed") {
      return res.status(200).json({
        message: "Payment already verified and completed",
        transaction,
        idempotent: true,
      });
    }



    // 6. Cryptographically verify signature using key secret (timing-safe comparison)
    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    const sigBuffer = Buffer.from(razorpay_signature, "utf-8");
    const genSigBuffer = Buffer.from(generated_signature, "utf-8");

    if (sigBuffer.length !== genSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, genSigBuffer)) {
      return res.status(400).json({ message: "Invalid payment signature verification failed" });
    }

    // 7. Atomic transaction for balance completion, status updates, and notification creation
    const result = await completePaymentHelper(
      transaction._id,
      razorpay_payment_id,
      razorpay_signature,
      req.app.get("io")
    );

    return res.status(200).json({
      message: "Payment successfully verified and completed",
      transaction: result.transaction,
      alreadyCompleted: result.alreadyCompleted,
    });
  } catch (err) {
    console.error("Error verifying payment signature:", err);
    return res.status(500).json({ message: err.message || "Internal server error during verification" });
  }
};

/**
 * Stage 6: Handle Razorpay Webhooks
 * Verifies webhook signatures timing-safely, parses the event, validates amounts,
 * and completes or fails the local transaction safely and idempotently.
 */
export const handleWebhook = async (req, res) => {
  try {
    const signatureHeader = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Warning: RAZORPAY_WEBHOOK_SECRET is not configured on the server.");
      return res.status(500).json({ message: "Webhook secret configuration error" });
    }

    if (!signatureHeader) {
      return res.status(400).json({ message: "Missing Razorpay webhook signature header" });
    }

    // 1. Signature Verification using raw body
    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.rawBody || "")
      .digest("hex");

    const sigBuffer = Buffer.from(signatureHeader, "utf-8");
    const compSigBuffer = Buffer.from(computedSignature, "utf-8");

    if (sigBuffer.length !== compSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, compSigBuffer)) {
      console.warn("Webhook signature mismatch!");
      return res.status(400).json({ message: "Webhook signature verification failed" });
    }

    // 2. Parse payload details
    const { event, payload } = req.body;
    if (!event || !payload) {
      return res.status(400).json({ message: "Invalid webhook payload structure" });
    }

    console.log(`Razorpay Webhook Event Received: "${event}"`);

    // Extract order/payment ID and amount
    const orderEntity = payload.order?.entity;
    const paymentEntity = payload.payment?.entity;

    const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;
    const razorpayPaymentId = paymentEntity?.id;
    const actualAmountInPaise = orderEntity?.amount || paymentEntity?.amount;

    if (!razorpayOrderId) {
      console.log("Webhook payload did not contain a valid Razorpay Order ID. Safe skip.");
      return res.status(200).json({ status: "skipped", reason: "no_order_id" });
    }

    // 3. Find matching local DigiPe transaction
    const transaction = await Transaction.findOne({ razorpayOrderId }).populate("senderAccount receiverAccount");
    if (!transaction) {
      console.log(`No DigiPe transaction matches Razorpay Order ID: "${razorpayOrderId}". Safe exit.`);
      // Return 200 OK according to the webhook contract (avoid endless retries for untracked items)
      return res.status(200).json({ status: "skipped", reason: "unknown_transaction" });
    }

    // 4. Handle events
    if (event === "order.paid" || event === "payment.captured") {
      // Amount verification: expected vs actual in paise
      const expectedAmountInPaise = Math.round(transaction.amount * 100);
      if (expectedAmountInPaise !== actualAmountInPaise) {
        console.warn(`Amount mismatch detected in webhook! Expected: ${expectedAmountInPaise} paise, Actual: ${actualAmountInPaise} paise.`);
        return res.status(400).json({ message: "Amount mismatch detected" });
      }

      // Handle idempotency: if already completed, do nothing but return success
      if (transaction.status === "completed") {
        return res.status(200).json({ status: "success", message: "Transaction already processed", idempotent: true });
      }

      // Invoke existing atomic completion logic
      const result = await completePaymentHelper(
        transaction._id,
        razorpayPaymentId || "webhook_payment_id",
        signatureHeader, // store webhook signature as proof of verification
        req.app.get("io")
      );

      return res.status(200).json({
        status: "success",
        message: "Transaction successfully completed via webhook",
        transactionId: result.transaction._id,
      });

    } else if (event === "payment.failed") {
      const errorMsg = paymentEntity?.error_description || "Payment failed";
      // Atomic update: only set status to failed if it is still pending
      const updatedTx = await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: "pending" },
        { 
          status: "failed",
          description: `${transaction.description || ""} (Failed: ${errorMsg})`.slice(0, 20)
        },
        { new: true }
      );
      if (updatedTx) {
        console.log(`Transaction ID ${transaction._id} marked as failed via webhook.`);
      } else {
        console.log(`Transaction ID ${transaction._id} was not pending. Ignored failure webhook.`);
      }
      return res.status(200).json({ status: "success", message: "Transaction marked failed or ignored via webhook" });
    }

    // Safely ignore other unsupported events
    return res.status(200).json({ status: "ignored", reason: "unsupported_event" });

  } catch (err) {
    console.error("Unhandled error processing Razorpay webhook:", err);
    // Return 500 so Razorpay retries the webhook in case of transient database or connection errors
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};
