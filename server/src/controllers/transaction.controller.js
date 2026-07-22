import mongoose from "mongoose";
import { Account } from "../models/account.model.js";
import { Notification } from "../models/notification.model.js";
import { Transaction } from "../models/transaction.model.js";
import { User } from "../models/user.model.js";
import { transactionSchema } from "../schemas/transaction.schema.js";

const executeTransfer = async (accountNumber, toAccountNumber, ifsc, firstname, lastname, amount, description, mpin, session) => {
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
    throw new Error("Transaction PIN has not been set. Please set your MPIN in Security Settings.");
  }
  if (!mpin) {
    throw new Error("Security MPIN is required");
  }
  const isMpinValid = await senderUser.validateMpin(String(mpin));
  if (!isMpinValid) {
    throw new Error("Incorrect Security MPIN");
  }

  if (senderAccount.balance < amount) {
    throw new Error("Insufficient Funds!");
  }

  senderAccount.balance -= amount;
  receiverAccount.balance += amount;

  const senderFullName = `${senderUser.firstname} ${senderUser.lastname}`;
  const receiverFullName = `${receiverUser.firstname} ${receiverUser.lastname}`;
  
  const txnData = {
    senderAccount: senderAccount._id,
    receiverAccount: receiverAccount._id,
    amount: amount,
    createdAt: new Date(),
    description:
      description ||
      `Transfer to ${receiverUser.firstname} ${receiverUser.lastname}`,
    status: "completed",
    referenceId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    metadata: {
      senderName: senderFullName,
      receiverName: receiverFullName,
      senderAccountNumber: senderAccount.accountNumber,
      receiverAccountNumber: receiverAccount.accountNumber,
    },
  };

  const transaction = session
    ? await Transaction.create([txnData], { session, ordered: true })
    : [await Transaction.create(txnData)];

  if (session) {
    await senderAccount.save({ session });
    await receiverAccount.save({ session });
  } else {
    await senderAccount.save();
    await receiverAccount.save();
  }

  const notifData = [
    {
      user: senderUser._id,
      type: "transaction",
      title: "Funds Sent",
      message: `You sent ${amount} to ${receiverUser.firstname} ${receiverUser.lastname}`,
    },
    {
      user: receiverUser._id,
      type: "transaction",
      title: "Funds Received",
      message: `Your received ${amount} from ${senderUser.firstname} ${senderUser.lastname}`,
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

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const result = await executeTransfer(accountNumber, toAccountNumber, ifsc, firstname, lastname, amount, description, mpin, session);

    await session.commitTransaction();
    session.endSession();

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

    return res.status(201).json({
      ...result.transaction[0].toObject(),
      senderAccount: {
        id: result.senderAccount.user,
        accountNumber: result.senderAccount.accountNumber,
        bankName: result.senderAccount.bankName,
        balance: result.senderAccount.balance,
      },
      receiverAccount: {
        id: result.receiverAccount.user,
        accountNumber: result.receiverAccount.accountNumber,
        bankName: result.receiverAccount.bankName,
        balance: result.receiverAccount.balance,
      },
      notification: result.notification,
    });
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (e) {}
    }

    const errStr = err.message || "";
    if (errStr.includes("Transaction numbers are only allowed") || errStr.includes("replica set") || errStr.includes("sessions are not supported")) {
      console.log("MongoDB is standalone (replica sets not supported). Retrying transaction execution without session context...");
      try {
        const result = await executeTransfer(accountNumber, toAccountNumber, ifsc, firstname, lastname, amount, description, mpin, null);
        
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

        return res.status(201).json({
          ...result.transaction[0].toObject(),
          senderAccount: {
            id: result.senderAccount.user,
            accountNumber: result.senderAccount.accountNumber,
            bankName: result.senderAccount.bankName,
            balance: result.senderAccount.balance,
          },
          receiverAccount: {
            id: result.receiverAccount.user,
            accountNumber: result.receiverAccount.accountNumber,
            bankName: result.receiverAccount.bankName,
            balance: result.receiverAccount.balance,
          },
          notification: result.notification,
        });
      } catch (retryErr) {
        console.error(`Retry Failed ${retryErr}`);
        return res.status(400).json({ message: retryErr.message || "Transaction failed" });
      }
    }

    console.error(`Transaction Failed ${err}`);
    return res.status(400).json({ message: err.message || "Transaction failed" });
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
