import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../config/redis.config.js";
import { verifyDpopProof } from "../utils/dpop.util.js";

/**
 * Authentication Middleware: Protects secure routes.
 * Supports:
 * 1. HttpOnly Cookie extraction (req.cookies.accessToken)
 * 2. Authorization Header fallback (Bearer <token> or DPoP <token>)
 * 3. Redis Token Revocation / Blacklist check
 * 4. RFC 9449 DPoP Cryptographic Proof verification if token is bound to a client key (cnf.jkt)
 */
export const protectMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;

  let headerToken = null;
  if (authHeader) {
    if (authHeader.startsWith("Bearer ") || authHeader.startsWith("DPoP ")) {
      headerToken = authHeader.split(" ")[1];
    } else {
      headerToken = authHeader;
    }
  }

  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ message: "You are not authenticated" });
  }

  // Check Redis Token Blacklist (Logout check)
  const isRevoked = await isTokenBlacklisted(token);
  if (isRevoked) {
    return res.status(401).json({ message: "Token has been revoked/logged out" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.userId || !decoded.email) {
      return res.status(401).json({ message: "Invalid session token payload" });
    }

    // RFC 9449: If token is bound to a client public key via cnf.jkt, enforce DPoP proof verification
    if (decoded.cnf && decoded.cnf.jkt) {
      const dpopHeader = req.headers.dpop || req.headers["x-dpop"];
      if (!dpopHeader) {
        return res.status(401).json({
          message: "DPoP proof required: Access token is cryptographically bound to a client DPoP key",
        });
      }

      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl || req.url}`;
      const dpopResult = await verifyDpopProof(dpopHeader, req.method, fullUrl, decoded.cnf.jkt);

      if (!dpopResult.valid) {
        return res.status(401).json({
          message: `DPoP verification failed: ${dpopResult.error}`,
        });
      }
    }

    req.userId = decoded.userId;
    req.email = decoded.email;
    req.token = token;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token has expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: err.message, message: "Authentication failed" });
  }
};

