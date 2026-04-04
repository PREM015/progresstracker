import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Strict validation: ENCRYPTION_KEY is mandatory and must be separate from NEXTAUTH_SECRET
if (!ENCRYPTION_KEY) {
  const errorMsg =
    "ENCRYPTION_KEY environment variable is not set. " +
    "This is required for secure encryption of OAuth tokens and sensitive data. " +
    "Set ENCRYPTION_KEY to a random 32+ character string in your .env file. " +
    "Generate with: openssl rand -base64 32";

  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMsg);
  } else {
    console.warn(`⚠️ WARNING: ${errorMsg}`);
  }
}

// Warn if key is too short
if (ENCRYPTION_KEY && ENCRYPTION_KEY.length < 32) {
  console.warn(
    "⚠️ WARNING: ENCRYPTION_KEY should be at least 32 characters for security"
  );
}

/**
 * Encrypt sensitive data (OAuth tokens, API keys)
 */
export function encrypt(text: string): string {
  if (!text) return "";

  try {
    return CryptoJS.AES.encrypt(text, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY!)).toString();
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";

  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY!));
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error("Decryption failed - invalid key or corrupted data");
    }

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash sensitive data (one-way, cannot be decrypted)
 */
export function hash(text: string): string {
  return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
}

/**
 * Compare two strings in constant time to prevent timing attacks
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    // Return early if lengths differ, but we shouldn't leak length info ideally.
    // For string comparisons where we need timing safety, lengths are usually fixed (e.g. tokens)
    return false;
  }
  
  try {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    
    // Ensure buffers are same length to avoid timingSafeEqual throwing an error
    if (bufferA.length !== bufferB.length) return false;
    
    // @ts-ignore - crypto is available in Node.js
    const crypto = require('crypto');
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    return false;
  }
}
