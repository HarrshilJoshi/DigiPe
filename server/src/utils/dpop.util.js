import crypto from "crypto";
import { acquireLock } from "../config/redis.config.js";

/**
 * Computes the RFC 7638 JSON Web Key (JWK) Thumbprint
 * Used in RFC 9449 DPoP to bind access tokens to public keys.
 * @param {object} jwk Public JWK object
 * @returns {string} Base64URL-encoded SHA-256 thumbprint
 */
export const computeJwkThumbprint = (jwk) => {
  if (!jwk || typeof jwk !== "object") {
    throw new Error("Invalid JWK provided for thumbprint computation");
  }

  let canonicalJson = "";
  if (jwk.kty === "EC") {
    // Required members in alphabetical order: crv, kty, x, y
    canonicalJson = JSON.stringify({
      crv: jwk.crv,
      kty: jwk.kty,
      x: jwk.x,
      y: jwk.y,
    });
  } else if (jwk.kty === "RSA") {
    // Required members in alphabetical order: e, kty, n
    canonicalJson = JSON.stringify({
      e: jwk.e,
      kty: jwk.kty,
      n: jwk.n,
    });
  } else {
    throw new Error(`Unsupported JWK key type: ${jwk.kty}`);
  }

  return crypto
    .createHash("sha256")
    .update(canonicalJson)
    .digest("base64url");
};

/**
 * Validates and verifies an incoming RFC 9449 DPoP Proof JWT
 * @param {string} dpopHeader The raw DPoP header string
 * @param {string} expectedMethod HTTP method (GET, POST, etc.)
 * @param {string} expectedUrl Target URL or endpoint path
 * @param {string|null} expectedJkt Expected JWK thumbprint from token's cnf.jkt claim
 * @returns {Promise<{ valid: boolean, jkt: string, error?: string }>}
 */
export const verifyDpopProof = async (dpopHeader, expectedMethod, expectedUrl, expectedJkt = null) => {
  if (!dpopHeader || typeof dpopHeader !== "string") {
    return { valid: false, error: "Missing or invalid DPoP proof header" };
  }

  const parts = dpopHeader.trim().split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed DPoP JWT format" };
  }

  const [headerB64, payloadB64, sigB64] = parts;

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch (err) {
    return { valid: false, error: "Failed to parse DPoP header or payload JSON" };
  }

  // 1. Header Validation (RFC 9449 §4.2)
  if (header.typ !== "dpop+jwt") {
    return { valid: false, error: `Invalid DPoP header 'typ': expected 'dpop+jwt', got '${header.typ}'` };
  }

  const allowedAlgs = ["ES256", "RS256"];
  if (!header.alg || !allowedAlgs.includes(header.alg)) {
    return { valid: false, error: `Unsupported or prohibited DPoP algorithm '${header.alg}'. Must be asymmetric (ES256, RS256).` };
  }

  const jwk = header.jwk;
  if (!jwk || typeof jwk !== "object" || jwk.d) {
    return { valid: false, error: "Missing or invalid public JWK in DPoP header (private keys strictly forbidden)" };
  }

  // 2. Compute Thumbprint and Match against Token Confirmation (cnf.jkt)
  let computedJkt;
  try {
    computedJkt = computeJwkThumbprint(jwk);
  } catch (e) {
    return { valid: false, error: `Error computing JWK thumbprint: ${e.message}` };
  }

  if (expectedJkt && computedJkt !== expectedJkt) {
    return {
      valid: false,
      error: "DPoP proof public key thumbprint does not match token 'cnf.jkt' confirmation claim",
    };
  }

  // 3. Cryptographic Signature Verification
  try {
    const pubKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const signedData = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
    const signature = Buffer.from(sigB64, "base64url");

    let isSignatureValid = false;
    if (header.alg === "ES256") {
      isSignatureValid = crypto.verify(
        "SHA256",
        signedData,
        { key: pubKey, dsaEncoding: "ieee-p1363" },
        signature
      );
    } else if (header.alg === "RS256") {
      isSignatureValid = crypto.verify("SHA256", signedData, pubKey, signature);
    }

    if (!isSignatureValid) {
      return { valid: false, error: "DPoP signature verification failed" };
    }
  } catch (err) {
    return { valid: false, error: `DPoP cryptographic verification error: ${err.message}` };
  }

  // 4. Payload Claims Validation (RFC 9449 §4.3)
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Check freshness (iat) within +/- 90 seconds clock skew
  if (!payload.iat || typeof payload.iat !== "number") {
    return { valid: false, error: "DPoP proof missing required 'iat' timestamp" };
  }
  if (Math.abs(nowInSeconds - payload.iat) > 90) {
    return { valid: false, error: "DPoP proof timestamp expired or out of allowed window (90s)" };
  }

  // Check HTTP method (htm)
  if (!payload.htm || payload.htm.toUpperCase() !== expectedMethod.toUpperCase()) {
    return {
      valid: false,
      error: `DPoP 'htm' mismatch: expected '${expectedMethod.toUpperCase()}', got '${payload.htm}'`,
    };
  }

  // Check HTTP target URI (htu) - strip query & fragment for comparison
  const normalizeUri = (uri) => {
    try {
      const parsed = new URL(uri, "http://localhost");
      return parsed.pathname.toLowerCase().replace(/\/+$/, "");
    } catch (e) {
      return (uri || "").split("?")[0].toLowerCase().replace(/\/+$/, "");
    }
  };

  const cleanExpected = normalizeUri(expectedUrl);
  const cleanReceived = normalizeUri(payload.htu);

  if (cleanExpected !== cleanReceived) {
    return {
      valid: false,
      error: `DPoP 'htu' mismatch: expected path '${cleanExpected}', got '${cleanReceived}'`,
    };
  }

  // 5. Replay Attack Prevention using unique 'jti' in Redis
  if (!payload.jti || typeof payload.jti !== "string") {
    return { valid: false, error: "DPoP proof missing required 'jti' identifier" };
  }

  // Attempt to acquire lock on jti for 300s (5 minutes)
  const jtiLockKey = `dpop:jti:${payload.jti}`;
  const isFresh = await acquireLock(jtiLockKey, 300);
  if (!isFresh) {
    return { valid: false, error: "DPoP proof replay detected ('jti' already used)" };
  }

  return {
    valid: true,
    jkt: computedJkt,
    payload,
  };
};
