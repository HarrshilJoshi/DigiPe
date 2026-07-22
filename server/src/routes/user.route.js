import express from "express";
import { protectMiddleware } from "../middlewares/protect.middleware.js";
import { getUserDetails, setMpin } from "../controllers/user.controller.js";
const router = express.Router();

router.get("/me", protectMiddleware, getUserDetails);
router.post("/set-mpin", protectMiddleware, setMpin);

export default router;
