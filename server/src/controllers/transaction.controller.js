import mongoose from "mongoose";
import { Account } from "../models/account.model.js";
import { Notification } from "../models/notification.model.js";
import { Transaction } from "../models/transaction.model.js";
import { User } from "../models/user.model.js";
import { transactionSchema } from "../schemas/transaction.schema.js";
import {
  acquireLock,
  releaseLock,
  getIdempotencyRecord,
  saveIdempotencyRecord,
  delCache,
  flushPattern,
  checkMpinLockout,
  recordMpinFailure,
  resetMpinAttempts,
} from "../config/redis.config.js";

const formatTransferResponse = (txn, senderAcc, receiverAcc, notification = null) => {
  const txnObj = txn.toObject ? txn.toObject() : txn;
  return {
    ...txnObj,
    senderAccount: {
      id: senderAcc?.user?._id || senderAcc?.user || null,
      accountNumber: senderAcc?.accountNumber || "",
      bankName: senderAcc?.bankName || "",
      balance: senderAcc?.balance ?? 0,
    },
    receiverAccount: {
      id: receiverAcc?.user?._id || receiverAcc?.user || null,
      accountNumber: receiverAcc?.accountNumber || "",
      bankName: receiverAcc?.bankName || "",
      balance: receiverAcc?.balance ?? 0,
    },
    ...(notification ? { notification } : {}),
  };
};

const executeTransfer = async (
  accountNumber,
  toAccountNumber,
  ifsc,
  firstname,
  lastname,
  amount,
  description,
  mpin,
  session,
  idempotencyKey = null
) => {
  const queryOpts = session ? { session } : {};
  const senderAccount = await Account.findOne({ accountNumber }, null, queryOpts);
  if (!senderAccount) {
    throw new Error("No primary account found for sender");
  }

  const numTo = String(toAccountNumber);
  const code = ifsc.toUpperCase();

  console.log(`Querying receiver accountNumber: ${numTo} & ifsc: ${code}`);

  const receiverAccountQuery = Account.findOne({
    accountNumber: numTo,
    ifsc: code,
  });
  if (session) receiverAccountQuery.session(session);
  const receiverAccount = await receiverAccountQuery.populate("user");

  if (!receiverAccount) {
    throw new Error("Recipient not found or details mismatch");
  }

  const receiverUser = session
    ? await User.findById(receiverAccount.user).session(session)
    : await User.findById(receiverAccount.user);

  const senderUser = session
    ? await User.findById(senderAccount.user).session(session)
    : await User.findById(senderAccount.user);

  if (
    !receiverUser ||
    receiverUser.firstname.toLowerCase() !== firstname.toLowerCase() ||
    receiverUser.lastname.toLowerCase() !== lastname.toLowerCase()
  ) {
    throw new Error("Receiver's name doesn't match account details");
  }

  // Validate MPIN
  if (!senderUser.mpin_hash) {
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
  const lockStatus = await checkMpinLockout(senderUser._id);
  if (lockStatus.locked) {
    const err = new Error("Account locked: Maximum 3 incorrect MPIN attempts reached. Transfers are frozen for 24 hours. Reset your PIN in Security Settings to unlock.");
    err.statusCode = 423;
    err.isLocked = true;
    throw err;
  }

  // 2. Validate MPIN with bcrypt
  const isMpinValid = await senderUser.validateMpin(String(mpin));
  if (!isMpinValid) {
    const failureStatus = await recordMpinFailure(senderUser._id);
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
  await resetMpinAttempts(senderUser._id);

  // Atomic conditional deduction directly in database engine (replaces vulnerable read-check-write)
  const updateSenderOpts = { new: true };
  if (session) updateSenderOpts.session = session;

  const updatedSenderAccount = await Account.findOneAndUpdate(
    {
      _id: senderAccount._id,
      balance: { $gte: amount }, // Invariant condition checked directly in DB engine
    },
    {
      $inc: { balance: -amount }, // Atomic decrement
    },
    updateSenderOpts
  );

  if (!updatedSenderAccount) {
    throw new Error("Insufficient Funds!");
  }

  // Atomic credit to recipient account directly in DB engine
  const updateReceiverOpts = { new: true };
  if (session) updateReceiverOpts.session = session;

  const updatedReceiverAccount = await Account.findOneAndUpdate(
    { _id: receiverAccount._id },
    { $inc: { balance: amount } }, // Atomic increment
    updateReceiverOpts
  );

  if (!updatedReceiverAccount) {
    if (!session) {
      await Account.findByIdAndUpdate(senderAccount._id, { $inc: { balance: amount } });
    }
    throw new Error("Recipient account could not be credited");
  }

  const senderFullName = `${senderUser.firstname} ${senderUser.lastname}`;
  const receiverFullName = `${receiverUser.firstname} ${receiverUser.lastname}`;

  const cleanIdemKey = idempotencyKey ? String(idempotencyKey).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) : null;
  const txnData = {
    senderAccount: updatedSenderAccount._id,
    receiverAccount: updatedReceiverAccount._id,
    amount: amount,
    createdAt: new Date(),
    description:
      description ||
      `Transfer to ${receiverUser.firstname} ${receiverUser.lastname}`,
    status: "completed",
    referenceId: cleanIdemKey ? `TXN-${cleanIdemKey}-${Date.now()}` : `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    idempotencyKey: idempotencyKey || undefined,
    metadata: {
      senderName: senderFullName,
      receiverName: receiverFullName,
      senderAccountNumber: updatedSenderAccount.accountNumber,
      receiverAccountNumber: updatedReceiverAccount.accountNumber,
    },
  };

  const transaction = session
    ? await Transaction.create([txnData], { session, ordered: true })
    : [await Transaction.create(txnData)];

  const notifData = [
    {
      user: senderUser._id,
      type: "transaction",
      title: "Funds Sent",
      message: `You sent ₹${amount} to ${receiverUser.firstname} ${receiverUser.lastname}`,
    },
    {
      user: receiverUser._id,
      type: "transaction",
      title: "Funds Received",
      message: `You received ₹${amount} from ${senderUser.firstname} ${senderUser.lastname}`,
    },
  ];

  const notification = session
    ? await Notification.create(notifData, { session, ordered: true })
    : await Notification.create(notifData);

  return { transaction, senderAccount, receiverAccount, notification };
};

export const transferFunds = async (req, res) => {
  const transactionResult = transactionSchema.safeParse(req.body);
  if (!transactionResult.success) {
    return res.status(400).json({
      message: `Invalid input for transaction`,
      errors: transactionResult.error.errors,
    });
  }
  const { toAccountNumber, ifsc, firstname, lastname, amount, description } =
    transactionResult.data;
  const accountNumber = req.headers["account-number"];
  const mpin = req.headers["x-mpin"] || req.body.mpin;

  const rawIdempotencyKey =
    req.headers["idempotency-key"] ||
    req.headers["x-idempotency-key"] ||
    req.body.idempotencyKey ||
    transactionResult.data.idempotencyKey;
  const finalIdempotencyKey = rawIdempotencyKey ? String(rawIdempotencyKey).trim() : null;

  // 1. Check Redis for completed response of this idempotency key
  if (finalIdempotencyKey) {
    try {
      const cachedResponse = await getIdempotencyRecord(finalIdempotencyKey);
      if (cachedResponse) {
        return res.status(200).json({
          ...cachedResponse,
          _idempotentReplay: true,
        });
      }
    } catch (e) {
      console.warn("Error reading idempotency cache from Redis:", e.message);
    }

    // 2. Check MongoDB for previously committed transaction with this idempotency key
    try {
      const existingTxn = await Transaction.findOne({ idempotencyKey: finalIdempotencyKey })
        .populate("senderAccount")
        .populate("receiverAccount");
      if (existingTxn) {
        const replayPayload = formatTransferResponse(
          existingTxn,
          existingTxn.senderAccount,
          existingTxn.receiverAccount
        );
        await saveIdempotencyRecord(finalIdempotencyKey, replayPayload, 86400);
        return res.status(200).json({
          ...replayPayload,
          _idempotentReplay: true,
        });
      }
    } catch (e) {
      console.warn("Error querying existing idempotency key in DB:", e.message);
    }
  }

  // Pre-flight check: is sender user locked out?
  if (req.userId) {
    const preLockCheck = await checkMpinLockout(req.userId);
    if (preLockCheck.locked) {
      return res.status(423).json({
        message: "Account locked: Maximum 3 incorrect MPIN attempts reached. Transfers are frozen for 24 hours. Reset your PIN in Security Settings to unlock.",
        isLocked: true,
      });
    }
  }

  // 3. Acquire Distributed Locks in Redis (Mutex) to block concurrent duplicate submissions
  let idemLockKey = null;
  let accountLockKey = null;

  if (finalIdempotencyKey) {
    idemLockKey = `lock:idempotency:${finalIdempotencyKey}`;
    const acquiredIdemLock = await acquireLock(idemLockKey, 30);
    if (!acquiredIdemLock) {
      return res.status(409).json({
        message: "A transaction with this idempotency key is already in progress. Please wait.",
      });
    }
  }

  if (accountNumber) {
    accountLockKey = `lock:transfer:account:${accountNumber}`;
    const acquiredAccountLock = await acquireLock(accountLockKey, 15);
    if (!acquiredAccountLock) {
      if (idemLockKey) await releaseLock(idemLockKey);
      return res.status(409).json({
        message: "Another transaction on this account is currently being processed. Please wait.",
      });
    }
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const result = await executeTransfer(
      accountNumber,
      toAccountNumber,
      ifsc,
      firstname,
      lastname,
      amount,
      description,
      mpin,
      session,
      finalIdempotencyKey
    );

    await session.commitTransaction();
    session.endSession();
    session = null;

    const io = req.app.get("io");
    if (io && result.transaction && result.transaction[0]) {
      const txnMeta = result.transaction[0].metadata;
      io.to(String(result.senderAccount.user)).emit("notification:new", {
        type: "transfer_sent",
        title: "Funds Sent",
        message: `You sent ₹${amount} to ${txnMeta.receiverName}`,
      });
      io.to(String(result.receiverAccount.user)).emit("notification:new", {
        type: "transfer_received",
        title: "Funds Received",
        message: `You received ₹${amount} from ${txnMeta.senderName}`,
      });
    }

    // Clear Redis profile & search caches for both parties
    try {
      await delCache(`user:profile:${result.senderAccount.user}`);
      await delCache(`user:profile:${result.receiverAccount.user}`);
      await flushPattern("search:*");
    } catch (e) { }

    const responsePayload = formatTransferResponse(
      result.transaction[0],
      result.senderAccount,
      result.receiverAccount,
      result.notification
    );

    // Save in Redis idempotency cache for 24 hours
    if (finalIdempotencyKey) {
      await saveIdempotencyRecord(finalIdempotencyKey, responsePayload, 86400);
    }

    return res.status(201).json(responsePayload);
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (e) { }
      session = null;
    }

    // Handle duplicate key error in MongoDB (if another parallel thread completed with this idempotency key)
    if (err.code === 11000 && (err.message.includes("idempotencyKey") || (err.keyPattern && err.keyPattern.idempotencyKey))) {
      try {
        const existingTxn = await Transaction.findOne({ idempotencyKey: finalIdempotencyKey })
          .populate("senderAccount")
          .populate("receiverAccount");
        if (existingTxn) {
          const replayPayload = formatTransferResponse(
            existingTxn,
            existingTxn.senderAccount,
            existingTxn.receiverAccount
          );
          if (finalIdempotencyKey) {
            await saveIdempotencyRecord(finalIdempotencyKey, replayPayload, 86400);
          }
          return res.status(200).json({
            ...replayPayload,
            _idempotentReplay: true,
          });
        }
      } catch (lookupErr) {
        console.error("Error looking up duplicate transaction:", lookupErr);
      }
    }

    const errStr = err.message || "";
    if (
      errStr.includes("Transaction numbers are only allowed") ||
      errStr.includes("replica set") ||
      errStr.includes("sessions are not supported")
    ) {
      console.log("MongoDB is standalone (replica sets not supported). Retrying transaction execution without session context...");
      try {
        const result = await executeTransfer(
          accountNumber,
          toAccountNumber,
          ifsc,
          firstname,
          lastname,
          amount,
          description,
          mpin,
          null,
          finalIdempotencyKey
        );

        const io = req.app.get("io");
        if (io && result.transaction && result.transaction[0]) {
          const txnMeta = result.transaction[0].metadata;
          io.to(String(result.senderAccount.user)).emit("notification:new", {
            type: "transfer_sent",
            title: "Funds Sent",
            message: `You sent ₹${amount} to ${txnMeta.receiverName}`,
          });
          io.to(String(result.receiverAccount.user)).emit("notification:new", {
            type: "transfer_received",
            title: "Funds Received",
            message: `You received ₹${amount} from ${txnMeta.senderName}`,
          });
        }

        try {
          await delCache(`user:profile:${result.senderAccount.user}`);
          await delCache(`user:profile:${result.receiverAccount.user}`);
          await flushPattern("search:*");
        } catch (e) { }

        const responsePayload = formatTransferResponse(
          result.transaction[0],
          result.senderAccount,
          result.receiverAccount,
          result.notification
        );

        if (finalIdempotencyKey) {
          await saveIdempotencyRecord(finalIdempotencyKey, responsePayload, 86400);
        }

        return res.status(201).json(responsePayload);
      } catch (retryErr) {
        console.error(`Retry Failed ${retryErr}`);
        return res.status(retryErr.statusCode || 400).json({
          message: retryErr.message || "Transaction failed",
          isLocked: retryErr.isLocked || false,
          remainingAttempts: retryErr.remainingAttempts,
        });
      }
    }

    console.error(`Transaction Failed ${err}`);
    return res.status(err.statusCode || 400).json({
      message: err.message || "Transaction failed",
      isLocked: err.isLocked || false,
      remainingAttempts: err.remainingAttempts,
    });
  } finally {
    // Release both distributed locks immediately
    if (idemLockKey) await releaseLock(idemLockKey);
    if (accountLockKey) await releaseLock(accountLockKey);
  }
};

export const getUserTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const accounts = await Account.find({ user: userId });
    const accountIds = accounts.map((acc) => acc._id);

    const transactions = await Transaction.find({
      $or: [
        { senderAccount: { $in: accountIds } },
        { receiverAccount: { $in: accountIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("senderAccount", "accountNumber bankName")
      .populate("receiverAccount", "accountNumber bankName")
      .lean();

    const formattedTransactions = transactions.map((txn) => ({
      id: txn._id,
      amount: txn.amount,
      description: txn.description,
      date: txn.createdAt,
      reference: txn.referenceId,
      receiver: {
        accountNumber: txn.metadata.receiverAccountNumber,
        name: txn.metadata.receiverName || "Unknown",
      },
      sender: {
        accountNumber: txn.senderAccount?.accountNumber,
        bankName: txn.senderAccount?.bankName,
      },
      status: txn.status,
    }));

    res.json(formattedTransactions);
  } catch (err) {
    console.log(err.message);
    res
      .status(500)
      .json({ error: "Failed to fetch transactions", details: err.message });
  }
};
