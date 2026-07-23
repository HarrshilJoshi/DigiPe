import cors from "cors";
import express from "express";
import accountRoutes from "./routes/account.route.js";
import authRoutes from "./routes/auth.route.js";
import transactionRoutes from "./routes/transaction.route.js";
import userRoutes from "./routes/user.route.js";
import requestRoutes from "./routes/request.route.js";

const app = express();

// Explicit CORS middleware configuration for production preflight & custom headers
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "account-number",
      "x-mpin",
      "X-Requested-With",
      "Accept",
    ],
    credentials: false,
  })
);

// Explicit preflight handler for all routes
app.options("*", cors());

app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1/transaction", transactionRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/payment-request", requestRoutes);

app.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

export default app;
