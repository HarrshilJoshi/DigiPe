import { checkRateLimit } from "../config/redis.config.js";

/**
 * Safe Redis Rate Limiter Middleware
 */
export const rateLimiter = (maxRequests = 10, windowSeconds = 60, prefix = "api") => {
  return async (req, res, next) => {
    try {
      const clientIp = req.headers["x-forwarded-for"] || req.ip || "anonymous";
      const identifier = `${prefix}:${req.userId || clientIp}`;
      
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
    } catch (e) {
      console.warn("Rate limiter fallback:", e.message);
    }
    next();
  };
};
