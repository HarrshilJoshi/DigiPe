import { User } from "../models/user.model.js";
import { getCache, setCache, delCache } from "../config/redis.config.js";

export const getUserDetails = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID not found in request" });
    }

    const cacheKey = `user:profile:${userId}`;
    const cachedProfile = await getCache(cacheKey);

    if (cachedProfile) {
      return res.status(200).json({ ...cachedProfile, _cached: true });
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

    // Cache profile in Redis for 5 minutes (300 seconds)
    await setCache(cacheKey, payload, 300);

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

    // Invalidate user profile cache in Redis
    await delCache(`user:profile:${req.userId}`);

    res.status(200).json({ message: "MPIN set successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
