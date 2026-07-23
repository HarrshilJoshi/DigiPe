import { checkRateLimit } from "../config/redis.config.js";

/**
 * Creates a rate limiter middleware
 * @param {number} maxRequests Max requests allowed
 * @param {number} windowSeconds Window duration in seconds
 * @param {string} prefix Identifier prefix
 */
export const rateLimiter = (maxRequests = 10, windowSeconds = 60, prefix = "api") => {
  return async (req, res, next) => {
    // Identifier by authenticated UserId if available, otherwise IP
    const identifier = `${prefix}:${req.userId || req.ip || req.headers["x-forwarded-for"] || "anonymous"}`;
    
    const { allowed, remaining, resetInSeconds } = await checkRateLimit(
      identifier,
      maxRequests,
      windowSeconds
    );

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);

    if (!allowed) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        error: `Rate limit exceeded. Try again in ${resetInSeconds || windowSeconds} seconds.`,
      });
    }

    next();
  };
};
