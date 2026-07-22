import express from "express";
import {
  createAccount,
  getAccount,
  searchAccounts,
} from "../controllers/account.controller.js";
import { protectMiddleware } from "../middlewares/protect.middleware.js";
const router = express.Router();

router.get("/get-account", protectMiddleware, getAccount);
router.post("/create-account", protectMiddleware, createAccount);
router.get("/search-accounts", protectMiddleware, searchAccounts);

export default router;
