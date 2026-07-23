import express from "express";
import { signup, signin, logout } from "../controllers/auth.controller.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";
import { protectMiddleware } from "../middlewares/protect.middleware.js";

const router = express.Router();

// Rate limit authentication routes to 10 requests per minute per IP
const authLimiter = rateLimiter(10, 60, "auth");

router.post("/signup", authLimiter, signup);
router.post("/signin", authLimiter, signin);
router.post("/logout", protectMiddleware, logout);

export default router;
