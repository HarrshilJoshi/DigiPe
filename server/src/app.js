import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import accountRoutes from "./routes/account.route.js";
import authRoutes from "./routes/auth.route.js";
import transactionRoutes from "./routes/transaction.route.js";
import userRoutes from "./routes/user.route.js";
import requestRoutes from "./routes/request.route.js";
import { handleWebhook } from "./controllers/razorpay.controller.js";

const app = express();

// Trust proxy for Render cloud reverse proxy
app.set("trust proxy", 1);

// Direct universal CORS header injection middleware supporting credentials & cookies
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, account-number, x-mpin, Idempotency-Key, idempotency-key, x-idempotency-key, DPoP, dpop"
  );
  res.header("Access-Control-Expose-Headers", "DPoP, dpop");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins with dynamic reflection for cookie credentials
      callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "account-number",
      "x-mpin",
      "Idempotency-Key",
      "idempotency-key",
      "x-idempotency-key",
      "DPoP",
      "dpop",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["DPoP", "dpop"],
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// Root health check endpoint for Render / cloud monitoring
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", service: "DigiPe API", timestamp: new Date() });
});
app.head("/", (req, res) => {
  res.status(200).end();
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1/transaction", transactionRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/payment-request", requestRoutes);
app.post("/api/webhooks/razorpay", handleWebhook);

app.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// Express error handler with CORS headers
app.use((err, req, res, next) => {
  console.error("Global Express Error:", err);
  res.header("Access-Control-Allow-Origin", "*");
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

export default app;
