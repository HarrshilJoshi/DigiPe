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

// Fallback in-memory store for local testing or when Redis is offline
const memoryStore = new Map();

/**
 * Helper to clean expired keys from memoryStore
 */
const getMemoryItem = (key) => {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt && Date.now() > item.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
};

/**
 * Get cache value
 */
export const getCache = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      // Fall through to memory store on error
    }
  }
  return getMemoryItem(key);
};

/**
 * Set cache with TTL in seconds
 */
export const setCache = async (key, value, ttlSeconds = 300) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return true;
    } catch (err) {
      // Fall through to memory store on error
    }
  }
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
  });
  return true;
};

/**
 * Delete specific cache key
 */
export const delCache = async (key) => {
  let success = false;
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      success = true;
    } catch (err) {}
  }
  if (memoryStore.has(key)) {
    memoryStore.delete(key);
    success = true;
  }
  return success;
};

/**
 * Delete keys matching pattern (e.g. "refresh:userId:*")
 */
export const flushPattern = async (pattern) => {
  if (isRedisConnected && redisClient) {
    try {
      const stream = redisClient.scanStream({ match: pattern, count: 100 });
      stream.on("data", (keys) => {
        if (keys.length) {
          const pipeline = redisClient.pipeline();
          keys.forEach((key) => pipeline.del(key));
          pipeline.exec();
        }
      });
    } catch (err) {}
  }
  // Match and delete in memory store
  const regexPattern = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const key of memoryStore.keys()) {
    if (regexPattern.test(key)) {
      memoryStore.delete(key);
    }
  }
  return true;
};

/**
 * Token Blacklist (Logout)
 */
export const blacklistToken = async (token, ttlSeconds = 86400) => {
  return await setCache(`bl:${token}`, "revoked", ttlSeconds);
};

export const isTokenBlacklisted = async (token) => {
  const result = await getCache(`bl:${token}`);
  return result === "revoked";
};

/**
 * Redis Rate Limiter with In-Memory fallback
 * @param {string} identifier IP or UserId
 * @param {number} maxRequests Max allowed in window
 * @param {number} windowSeconds Time window
 */
export const checkRateLimit = async (identifier, maxRequests = 10, windowSeconds = 60) => {
  if (isRedisConnected && redisClient) {
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
      // Fall through to memory store
    }
  }

  // Memory fallback rate limiter
  const rlKey = `rl:${identifier}`;
  const now = Date.now();
  let item = memoryStore.get(rlKey);
  if (!item || now > item.expiresAt) {
    item = { count: 1, expiresAt: now + windowSeconds * 1000 };
    memoryStore.set(rlKey, item);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  item.count += 1;
  if (item.count > maxRequests) {
    const remainingSeconds = Math.ceil((item.expiresAt - now) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds: remainingSeconds };
  }
  return { allowed: true, remaining: maxRequests - item.count };
};

/**
 * Distributed Lock (Mutex) via Redis SET NX EX with In-Memory fallback
 * @param {string} key Lock identifier
 * @param {number} ttlSeconds Lock expiration time in seconds (default 30s)
 * @returns {Promise<boolean>} True if lock acquired, false if already locked
 */
export const acquireLock = async (key, ttlSeconds = 30) => {
  if (isRedisConnected && redisClient) {
    try {
      const result = await redisClient.set(key, "locked", "EX", ttlSeconds, "NX");
      return result === "OK";
    } catch (err) {
      console.warn("⚠️ Error acquiring lock in Redis, using memory store:", err.message);
    }
  }

  // Memory store lock
  const existing = getMemoryItem(key);
  if (existing) {
    return false; // Already locked
  }
  memoryStore.set(key, {
    value: "locked",
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return true;
};

/**
 * Releases a previously acquired distributed lock
 * @param {string} key Lock identifier
 */
export const releaseLock = async (key) => {
  return await delCache(key);
};

/**
 * Retrieves a completed transaction response for an idempotency key
 * @param {string} key Idempotency key
 */
export const getIdempotencyRecord = async (key) => {
  return await getCache(`idem:${key}`);
};

/**
 * Caches a completed transaction response for an idempotency key (defaults to 24-hour TTL)
 * @param {string} key Idempotency key
 * @param {object} data Response payload
 * @param {number} ttlSeconds Time-to-live in seconds
 */
export const saveIdempotencyRecord = async (key, data, ttlSeconds = 86400) => {
  return await setCache(`idem:${key}`, data, ttlSeconds);
};

/**
 * Checks if a user's MPIN is locked due to 3 consecutive failures.
 * @param {string} userId
 * @returns {Promise<{ locked: boolean, attempts: number, remainingAttempts: number }>}
 */
export const checkMpinLockout = async (userId) => {
  const lockKey = `mpin:locked:${userId}`;
  const isLocked = await getCache(lockKey);
  if (isLocked) {
    return { locked: true, attempts: 3, remainingAttempts: 0 };
  }

  const attemptKey = `mpin:attempts:${userId}`;
  const attempts = Number(await getCache(attemptKey)) || 0;
  return {
    locked: false,
    attempts,
    remainingAttempts: Math.max(0, 3 - attempts),
  };
};

/**
 * Records a failed MPIN attempt.
 * Increments the failure count (24h window).
 * If 3 failed attempts are reached, locks MPIN transfers for 24 hours (86,400s).
 * @param {string} userId
 * @returns {Promise<{ locked: boolean, attempts: number, remainingAttempts: number }>}
 */
export const recordMpinFailure = async (userId) => {
  const attemptKey = `mpin:attempts:${userId}`;
  const currentAttempts = (Number(await getCache(attemptKey)) || 0) + 1;

  // 24 hours TTL = 86400 seconds
  await setCache(attemptKey, currentAttempts, 86400);

  if (currentAttempts >= 3) {
    // Lock user for 24 hours
    await setCache(`mpin:locked:${userId}`, "locked", 86400);
    return { locked: true, attempts: currentAttempts, remainingAttempts: 0 };
  }

  return {
    locked: false,
    attempts: currentAttempts,
    remainingAttempts: Math.max(0, 3 - currentAttempts),
  };
};

/**
 * Resets MPIN failed attempts and clears lockout (e.g. after successful transfer or PIN reset)
 * @param {string} userId
 */
export const resetMpinAttempts = async (userId) => {
  await delCache(`mpin:attempts:${userId}`);
  await delCache(`mpin:locked:${userId}`);
};

export default redisClient;

