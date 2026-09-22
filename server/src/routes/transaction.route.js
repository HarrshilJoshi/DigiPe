import express from "express";
import { transferFunds, getUserTransactions } from "../controllers/transaction.controller.js";
import { createOrder, verifyPayment } from "../controllers/razorpay.controller.js";
import { protectMiddleware } from "../middlewares/protect.middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = express.Router();

// Rate limit transfer requests to 15 per minute per user to prevent duplicate spamming
const transferLimiter = rateLimiter(15, 60, "transfer");

router.post("/transfer-funds", protectMiddleware, transferLimiter, transferFunds);
router.post("/create-order", protectMiddleware, transferLimiter, createOrder);
router.post("/verify-payment", protectMiddleware, verifyPayment);
router.get("/transactions", protectMiddleware, getUserTransactions);

export default router;
