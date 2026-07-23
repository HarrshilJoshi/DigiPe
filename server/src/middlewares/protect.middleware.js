import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../config/redis.config.js";

export const protectMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(400).json(`Invalid authorization header`);

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: `You are not authenticated` });

  // Check Redis Token Blacklist
  const isRevoked = await isTokenBlacklisted(token);
  if (isRevoked) {
    return res.status(401).json({ message: "Token has been revoked/logged out" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userId && decoded.email) {
      req.userId = decoded.userId;
      req.token = token;
      return next();
    } else {
      res.status(401).json({ message: `You are not authenticated` });
    }
  } catch (err) {
    res.status(401).json({ error: err.message, err });
  }
};
