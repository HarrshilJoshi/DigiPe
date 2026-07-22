import express from "express";
import { transferFunds } from "../controllers/transaction.controller.js";
import { getUserTransactions } from "../controllers/transaction.controller.js";
import { protectMiddleware } from "../middlewares/protect.middleware.js";
const router = express.Router();

router.post("/transfer-funds", protectMiddleware, transferFunds);
router.get("/transactions", protectMiddleware, getUserTransactions);

export default router;
