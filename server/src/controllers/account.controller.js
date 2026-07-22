import { Account } from "../models/account.model.js";
import { User } from "../models/user.model.js";
import { Transaction } from "../models/transaction.model.js";
import { accountSchema } from "../schemas/account.schema.js";

export const getAccount = async (req, res) => {
  const account = await Account.find({ accountNumber: req.body.accountNumber });
  if (!account)
    return res.status(404).json({ message: `Account doesn't exist` });
  const payload = {
    id: account._id,
    accountNumber: account.accountNumber,
    ifsc: account.ifsc,
    bankName: account.bankName,
    balance: account.balance,
  };
  if (account.transactions && account.transactions.length > 0) {
    payload.transactions = account.transactions.map((txn) => ({
      id: txn._id,
      amount: txn.amount,
      description: txn.description,
      date: txn.createdAt,
      referenceId: txn.referenceId,
      senderAccount: {
        id: txn.senderAccount._id,
        accountNumber: txn.senderAccount.accountNumber,
        bankName: txn.senderAccount.bankName,
        balance: txn.senderAccount.balance,
      },
      receiverAccount: {
        id: txn.receiverAccount._id,
        accountNumber: txn.receiverAccount.accountNumber,
        bankName: txn.receiverAccount.bankName,
        balance: txn.receiverAccount.balance,
      },
      status: txn.status,
    }));
  }
  res.json({
    accountDetails: account.map((a) => ({
      accountNumber: a.accountNumber,
      ifsc: a.ifsc,
      bankName: a.bankName,
      balance: a.balance,
    })),
  });
};

export const createAccount = async (req, res) => {
  const accountResult = accountSchema.safeParse(req.body);
  if (!accountResult.success) {
    return res.status(400).json({
      message: `Invalid Input`,
      error: accountResult.error.errors,
    });
  }

  const { accountNumber, ifsc, bankName, balance } = accountResult.data;

  try {
    const existingAccount = await Account.findOne({ accountNumber });
    if (existingAccount) {
      return res.status(400).json({ error: `Account already exists` });
    }
    const account = await Account.create({
      user: req.userId,
      accountNumber,
      ifsc,
      bankName,
      balance: balance !== undefined ? balance : 0,
    });
    await User.findByIdAndUpdate(req.userId, {
      $push: { account: account._id },
    });
    res.status(201).json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: `Internal Server error ${err.message}`,
    });
  }
};

export const searchAccounts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ accounts: [], transactions: [] });

    const searchRegex = new RegExp(q.trim(), "i");

    // 1. Search users matching name or username or email
    const matchingUsers = await User.find({
      $or: [
        { firstname: { $regex: searchRegex } },
        { lastname: { $regex: searchRegex } },
        { username: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ],
    }).select("firstname lastname username email");

    const userIds = matchingUsers.map((u) => u._id);

    // 2. Search accounts matching details or owned by matching users
    const accounts = await Account.find({
      $or: [
        { accountNumber: { $regex: searchRegex } },
        { ifsc: { $regex: searchRegex } },
        { bankName: { $regex: searchRegex } },
        { user: { $in: userIds } },
      ],
    }).populate("user", "firstname lastname email username");

    // 3. Search transactions matching query (description, ref ID, status, or metadata)
    const isNumber = !isNaN(Number(q.trim()));
    const transactionConditions = [
      { description: { $regex: searchRegex } },
      { referenceId: { $regex: searchRegex } },
      { status: { $regex: searchRegex } },
      { "metadata.senderName": { $regex: searchRegex } },
      { "metadata.receiverName": { $regex: searchRegex } },
      { "metadata.senderAccountNumber": { $regex: searchRegex } },
      { "metadata.receiverAccountNumber": { $regex: searchRegex } },
    ];
    if (isNumber) {
      transactionConditions.push({ amount: Number(q.trim()) });
    }

    const transactions = await Transaction.find({
      $or: transactionConditions,
    })
      .populate({
        path: "senderAccount",
        populate: { path: "user", select: "firstname lastname" },
      })
      .populate({
        path: "receiverAccount",
        populate: { path: "user", select: "firstname lastname" },
      })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      accounts: accounts.map((acc) => ({
        id: acc._id,
        firstname: acc.user?.firstname || "",
        lastname: acc.user?.lastname || "",
        username: acc.user?.username || "",
        email: acc.user?.email || "",
        accountNumber: acc.accountNumber,
        ifsc: acc.ifsc,
        bankName: acc.bankName,
      })),
      transactions: transactions.map((t) => ({
        id: t._id,
        referenceId: t.referenceId || "",
        amount: t.amount,
        description: t.description || "Transfer",
        status: t.status,
        date: t.createdAt,
        senderName:
          t.metadata?.senderName ||
          (t.senderAccount?.user
            ? `${t.senderAccount.user.firstname} ${t.senderAccount.user.lastname}`
            : "Unknown"),
        receiverName:
          t.metadata?.receiverName ||
          (t.receiverAccount?.user
            ? `${t.receiverAccount.user.firstname} ${t.receiverAccount.user.lastname}`
            : "Unknown"),
        senderAccountNum: t.metadata?.senderAccountNumber || t.senderAccount?.accountNumber || "",
        receiverAccountNum: t.metadata?.receiverAccountNumber || t.receiverAccount?.accountNumber || "",
      })),
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: `Internal Server Error ${err.message}` });
  }
};
