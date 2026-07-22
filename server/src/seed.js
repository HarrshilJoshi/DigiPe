import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models/user.model.js";
import { Account } from "./models/account.model.js";

dotenv.config({ path: "./src/config/.env" });

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI || "mongodb://localhost:27017/digipe");
    console.log("Connected to DB for seeding...");

    // Clear existing test users if any
    await User.deleteMany({ email: { $in: ["john@example.com", "jane@example.com"] } });
    await Account.deleteMany({ accountNumber: { $in: ["1000200030", "9000800070"] } });

    // Salt password & mpin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);
    const hashedMpin = await bcrypt.hash("1234", salt);

    // Create User 1: John Doe
    const user1 = new User({
      username: "johndoe",
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      phone: "9876543210",
      password_hash: hashedPassword,
      mpin_hash: hashedMpin,
    });
    await user1.save();

    const account1 = await Account.create({
      user: user1._id,
      accountNumber: "1000200030",
      ifsc: "HDFC0001234",
      bankName: "HDFC Bank",
      balance: 10000,
    });

    user1.account = [account1._id];
    await user1.save();

    // Create User 2: Jane Smith
    const user2 = new User({
      username: "janesmith",
      firstname: "Jane",
      lastname: "Smith",
      email: "jane@example.com",
      phone: "9876543211",
      password_hash: hashedPassword,
      mpin_hash: hashedMpin,
    });
    await user2.save();

    const account2 = await Account.create({
      user: user2._id,
      accountNumber: "9000800070",
      ifsc: "SBIN0005678",
      bankName: "State Bank of India",
      balance: 5000,
    });

    user2.account = [account2._id];
    await user2.save();

    console.log("Successfully seeded users and accounts!");
    console.log("User 1: Email: john@example.com | Pass: password123 | Acc#: 1000200030 | IFSC: HDFC0001234");
    console.log("User 2: Email: jane@example.com | Pass: password123 | Acc#: 9000800070 | IFSC: SBIN0005678");

    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedDB();
