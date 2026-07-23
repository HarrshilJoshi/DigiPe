import Redis from "ioredis";

let redisClient = null;
let isRedisConnected = false;

const rawRedisUrl = process.env.REDIS_URL;
const REDIS_URL = rawRedisUrl ? rawRedisUrl.replace(/^["']|["']$/g, "").trim() : "";

if (REDIS_URL) {
  try {
    const isTls = REDIS_URL.startsWith("rediss://");

    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) {
          console.warn("⚠️ Redis failed to connect after 3 attempts. Disabling Redis and running in pure MongoDB mode.");
          return null; // Stop retrying after 3 attempts to prevent CPU loops
        }
        return Math.min(times * 500, 2000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("⚡ Redis connected successfully!");
    });

    redisClient.on("error", (err) => {
      isRedisConnected = false;
      console.warn("⚠️ Redis connection note:", err.message);
      if (err.message && (err.message.includes("WRONGPASS") || err.message.includes("NOAUTH"))) {
        console.warn("⚠️ Invalid Redis credentials detected. Disconnecting Redis fallback.");
        try {
          redisClient.disconnect();
        } catch (e) {}
      }
    });

    // Attempt initial async connection silently
    redisClient.connect().catch((err) => {
      isRedisConnected = false;
      console.warn("⚠️ Initial Redis connection note:", err.message);
      try {
        redisClient.disconnect();
      } catch (e) {}
    });
  } catch (err) {
    console.warn("⚠️ Redis initialization skipped:", err.message);
    isRedisConnected = false;
  }
} else {
  console.log("ℹ️ No REDIS_URL configured. Running server in pure MongoDB mode.");
}

/**
 * Get cache value
 */
export const getCache = async (key) => {
  if (!isRedisConnected || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
};

/**
 * Set cache with TTL in seconds
 */
export const setCache = async (key, value, ttlSeconds = 300) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Delete specific cache key
 */
export const delCache = async (key) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Delete keys matching pattern (e.g. "search:*")
 */
export const flushPattern = async (pattern) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    const stream = redisClient.scanStream({ match: pattern, count: 100 });
    stream.on("data", (keys) => {
      if (keys.length) {
        const pipeline = redisClient.pipeline();
        keys.forEach((key) => pipeline.del(key));
        pipeline.exec();
      }
    });
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Token Blacklist (Logout)
 */
export const blacklistToken = async (token, ttlSeconds = 86400) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    await redisClient.set(`bl:${token}`, "revoked", "EX", ttlSeconds);
    return true;
  } catch (err) {
    return false;
  }
};

export const isTokenBlacklisted = async (token) => {
  if (!isRedisConnected || !redisClient) return false;
  try {
    const result = await redisClient.get(`bl:${token}`);
    return result === "revoked";
  } catch (err) {
    return false;
  }
};

/**
 * Redis Rate Limiter
 * @param {string} identifier IP or UserId
 * @param {number} maxRequests Max allowed in window
 * @param {number} windowSeconds Time window
 */
export const checkRateLimit = async (identifier, maxRequests = 10, windowSeconds = 60) => {
  if (!isRedisConnected || !redisClient) return { allowed: true, remaining: maxRequests };
  try {
    const key = `rl:${identifier}`;
    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    if (current > maxRequests) {
      const ttl = await redisClient.ttl(key);
      return { allowed: false, remaining: 0, resetInSeconds: ttl };
    }

    return { allowed: true, remaining: maxRequests - current };
  } catch (err) {
    return { allowed: true, remaining: maxRequests }; // Fail open if Redis has error
  }
};

export default redisClient;
