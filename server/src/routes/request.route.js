import express from "express";
import { protectMiddleware } from "../middlewares/protect.middleware.js";
import {
  createPaymentRequest,
  getMyRequests,
  respondToRequest,
} from "../controllers/request.controller.js";

const router = express.Router();

router.post("/create", protectMiddleware, createPaymentRequest);
router.get("/my-requests", protectMiddleware, getMyRequests);
router.post("/respond", protectMiddleware, respondToRequest);

export default router;
