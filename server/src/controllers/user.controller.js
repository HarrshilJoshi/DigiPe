import { User } from "../models/user.model.js";
import { Account } from "../models/account.model.js";

export const getUserDetails = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID not found in request" });
    }
    const user = await User.findById(userId).populate("account").lean();
    if (!user) {
      return res.status(404).json({ message: `User not found` });
    }
    const payload = {
      id: user._id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone,
      hasMpin: Boolean(user.mpin_hash),
    };
    if (user.account && user.account.length > 0) {
      payload.account = user.account.map((acc) => ({
        id: acc._id,
        accountNumber: acc.accountNumber,
        ifsc: acc.ifsc,
        bankName: acc.bankName,
        balance: acc.balance,
      }));
    }
    res.status(200).json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Internal Server Error: ${err.message}` });
  }
};

export const setMpin = async (req, res) => {
  try {
    const { mpin } = req.body;
    if (!mpin || String(mpin).length !== 4) {
      return res.status(400).json({ message: "MPIN must be a 4-digit number" });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.mpin_hash = await user.createMpinHash(String(mpin));
    await user.save();

    res.status(200).json({ message: "MPIN set successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
