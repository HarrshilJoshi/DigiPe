import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { signupSchema } from "../schemas/signup.schema.js";
import { signinSchema } from "../schemas/signin.schema.js";
import {
  setCache,
  getCache,
  delCache,
  flushPattern,
  blacklistToken,
} from "../config/redis.config.js";
import { verifyDpopProof } from "../utils/dpop.util.js";

const getRefreshSecret = () =>
  process.env.REFRESH_TOKEN_SECRET || (process.env.JWT_SECRET + "_REFRESH");

const getCookieOptions = (maxAgeMs) => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: maxAgeMs,
  };
};

/**
 * Generates a short-lived 15-minute Access Token and a 7-day Refresh Token.
 * Binds the access token to the client's DPoP public key (cnf.jkt) if provided.
 */
const generateAuthTokens = async (user, dpopJkt = null) => {
  // 1. Short-Lived Access Token (15 minutes)
  const accessPayload = {
    userId: user._id,
    email: user.email,
  };
  if (dpopJkt) {
    accessPayload.cnf = { jkt: dpopJkt };
  }

  const accessToken = jwt.sign(accessPayload, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  // 2. Long-Lived Refresh Token (7 days) with unique session ID
  const tokenId = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { userId: user._id, email: user.email, tokenId },
    getRefreshSecret(),
    { expiresIn: "7d" }
  );

  // Store active refresh session in Redis (7 days = 604800s)
  await setCache(`refresh:${user._id}:${tokenId}`, "valid", 604800);

  return { accessToken, refreshToken, tokenId };
};

/**
 * Attaches HttpOnly security cookies to the response
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, getCookieOptions(15 * 60 * 1000)); // 15 mins
  res.cookie("refreshToken", refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000)); // 7 days
};

/**
 * Clears HttpOnly security cookies on logout
 */
const clearAuthCookies = (res) => {
  const clearOpts = { ...getCookieOptions(0), maxAge: 0 };
  res.clearCookie("accessToken", clearOpts);
  res.clearCookie("refreshToken", clearOpts);
};

/**
 * Handles user registration.
 */
export const signup = async (req, res) => {
  const signupResult = signupSchema.safeParse(req.body);
  if (!signupResult.success) {
    return res.status(400).json({
      message: `Validation failed`,
      error: signupResult.error.errors,
    });
  }

  const { username, firstname, lastname, phone, email, password } =
    signupResult.data;

  try {
    const existing = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: `Email or username already taken` });
    }

    const newUser = new User({
      username,
      firstname,
      lastname,
      phone,
      email,
    });
    const hashedPassword = await newUser.createHash(password);
    newUser.password_hash = hashedPassword;
    await newUser.save();

    // Check optional RFC 9449 DPoP proof from client
    let dpopJkt = null;
    const dpopHeader = req.headers.dpop || req.headers["x-dpop"];
    if (dpopHeader) {
      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl || req.url}`;
      const dpopCheck = await verifyDpopProof(dpopHeader, req.method, fullUrl);
      if (dpopCheck.valid) {
        dpopJkt = dpopCheck.jkt;
      }
    }

    const { accessToken, refreshToken } = await generateAuthTokens(newUser, dpopJkt);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: `User created successfully!`,
      token: accessToken,
      accessToken,
      refreshToken,
      tokenType: dpopJkt ? "DPoP" : "Bearer",
      expiresIn: 900, // 15 minutes
      user: {
        id: newUser._id,
        username: newUser.username,
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        email: newUser.email,
        phone: newUser.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: `Internal server error! ${err.message}`,
    });
  }
};

/**
 * Handles user login.
 */
export const signin = async (req, res) => {
  const signinResult = signinSchema.safeParse(req.body);
  if (!signinResult.success) {
    return res.status(400).json({
      message: `Validation failed`,
      error: signinResult.error.errors,
    });
  }

  const { email, password } = signinResult.data;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: `Invalid Email` });
    const isMatch = await user.validatePassword(password);
    if (!isMatch) return res.status(400).json({ message: `Invalid Password` });

    // Check optional RFC 9449 DPoP proof from client
    let dpopJkt = null;
    const dpopHeader = req.headers.dpop || req.headers["x-dpop"];
    if (dpopHeader) {
      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl || req.url}`;
      const dpopCheck = await verifyDpopProof(dpopHeader, req.method, fullUrl);
      if (dpopCheck.valid) {
        dpopJkt = dpopCheck.jkt;
      }
    }

    const { accessToken, refreshToken } = await generateAuthTokens(user, dpopJkt);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: `Sign in successful`,
      token: accessToken,
      accessToken,
      refreshToken,
      tokenType: dpopJkt ? "DPoP" : "Bearer",
      expiresIn: 900, // 15 minutes
      user: {
        id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: `Internal server error, ${err.message}` });
  }
};

/**
 * Handles Refresh Token Rotation (RFC 6749 / Best Current Practice).
 * Validates the refresh token, detects token reuse attacks, issues a fresh
 * 15m access token and rotated refresh token, and invalidates the old one.
 */
export const refreshToken = async (req, res) => {
  try {
    const candidateToken =
      req.cookies?.refreshToken ||
      req.body?.refreshToken ||
      req.headers["x-refresh-token"];

    if (!candidateToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(candidateToken, getRefreshSecret());
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token. Please sign in again." });
    }

    // Check if active session exists in Redis
    const sessionKey = `refresh:${decoded.userId}:${decoded.tokenId}`;
    const isValid = await getCache(sessionKey);

    if (!isValid) {
      // Token Reuse Detected! An attacker might be attempting to replay a previously rotated token.
      // Defensively revoke all active refresh tokens for this user!
      console.warn(`🚨 Refresh token reuse detected for user ${decoded.userId}! Revoking all sessions.`);
      await flushPattern(`refresh:${decoded.userId}:*`);
      clearAuthCookies(res);
      return res.status(403).json({
        message: "Security alert: Token reuse detected. All sessions have been terminated. Please sign in again.",
      });
    }

    // Invalidate the old refresh token (One-time use)
    await delCache(sessionKey);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User account no longer exists" });
    }

    // Check optional DPoP proof on refresh request
    let dpopJkt = null;
    const dpopHeader = req.headers.dpop || req.headers["x-dpop"];
    if (dpopHeader) {
      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl || req.url}`;
      const dpopCheck = await verifyDpopProof(dpopHeader, req.method, fullUrl);
      if (dpopCheck.valid) {
        dpopJkt = dpopCheck.jkt;
      }
    }

    // Generate rotated tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateAuthTokens(user, dpopJkt);

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      message: "Token refreshed successfully",
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: dpopJkt ? "DPoP" : "Bearer",
      expiresIn: 900,
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ message: "Internal server error while refreshing session" });
  }
};

/**
 * Handles user logout.
 * Revokes the access token and refresh token in Redis and clears HttpOnly cookies.
 */
export const logout = async (req, res) => {
  try {
    const token =
      req.token ||
      req.cookies?.accessToken ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (token) {
      await blacklistToken(token, 1800); // 30 min blacklist
    }

    // Revoke refresh token if provided
    const refToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refToken) {
      try {
        const decoded = jwt.verify(refToken, getRefreshSecret());
        await delCache(`refresh:${decoded.userId}:${decoded.tokenId}`);
      } catch (e) {}
    }

    clearAuthCookies(res);
    return res.status(200).json({ message: "Logout successful and tokens revoked." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
