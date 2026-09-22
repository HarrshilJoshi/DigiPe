/**
 * client/src/utils/dpop.js
 * RFC 9449 Client DPoP (Demonstrating Proof-of-Possession) Utility
 * Generates an asymmetric ECDSA P-256 keypair in the browser's Web Crypto Subtle API
 * and signs ephemeral DPoP proof JWTs to bind access tokens to the client's device.
 */

const base64url = (input) => {
  let base64 = "";
  if (typeof input === "string") {
    base64 = btoa(unescape(encodeURIComponent(input)));
  } else {
    const bytes = new Uint8Array(input);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

let cachedKeyPair = null;
let cachedPublicJwk = null;
const STORAGE_KEY = "digipe_dpop_keypair";

/**
 * Retrieves or restores an in-memory ECDSA P-256 keypair.
 * Persists in sessionStorage so page refreshes and navigations retain the same keypair.
 */
export const getDpopKeys = async () => {
  if (cachedKeyPair && cachedPublicJwk) {
    return { keyPair: cachedKeyPair, jwk: cachedPublicJwk };
  }

  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    return null;
  }

  // 1. Attempt to restore active session keypair from sessionStorage
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.privateJwk && parsed.publicJwk) {
        const privateKey = await window.crypto.subtle.importKey(
          "jwk",
          parsed.privateJwk,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["sign"]
        );
        const publicKey = await window.crypto.subtle.importKey(
          "jwk",
          parsed.publicJwk,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["verify"]
        );

        cachedKeyPair = { privateKey, publicKey };
        cachedPublicJwk = parsed.publicJwk;
        return { keyPair: cachedKeyPair, jwk: cachedPublicJwk };
      }
    }
  } catch (err) {
    console.warn("⚠️ Could not restore DPoP keypair from sessionStorage:", err.message);
  }

  // 2. Generate new keypair and persist in sessionStorage
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    const privateJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

    cachedKeyPair = keyPair;
    cachedPublicJwk = {
      kty: publicJwk.kty,
      crv: publicJwk.crv,
      x: publicJwk.x,
      y: publicJwk.y,
    };

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ privateJwk, publicJwk: cachedPublicJwk })
      );
    } catch (e) {}

    return { keyPair: cachedKeyPair, jwk: cachedPublicJwk };
  } catch (err) {
    console.warn("⚠️ Web Crypto DPoP keypair generation unavailable:", err.message);
    return null;
  }
};

/**
 * Clears the active DPoP keypair on logout or session reset
 */
export const clearDpopKeys = () => {
  cachedKeyPair = null;
  cachedPublicJwk = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
};

/**
 * Generates and cryptographically signs a valid RFC 9449 DPoP Proof
 * @param {string} method HTTP Method (GET, POST, etc.)
 * @param {string} url Target URL or endpoint path
 * @returns {Promise<string|null>} Base64URL-encoded DPoP JWT Proof
 */
export const generateDpopProof = async (method, url) => {
  const keys = await getDpopKeys();
  if (!keys) return null;

  try {
    const header = {
      typ: "dpop+jwt",
      alg: "ES256",
      jwk: keys.jwk,
    };

    const payload = {
      jti:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `dpop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      htm: method.toUpperCase(),
      htu: url,
      iat: Math.floor(Date.now() / 1000),
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signatureBuffer = await window.crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      keys.keyPair.privateKey,
      new TextEncoder().encode(signingInput)
    );

    const encodedSignature = base64url(signatureBuffer);
    return `${signingInput}.${encodedSignature}`;
  } catch (err) {
    console.warn("⚠️ Failed to sign DPoP proof:", err.message);
    return null;
  }
};
