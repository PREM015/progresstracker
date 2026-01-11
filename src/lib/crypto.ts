import CryptoJS from "crypto-js";


const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;

if (process.env.NODE_ENV === "production" && !ENCRYPTION_KEY) {
  console.warn(
    "⚠️ WARNING: ENCRYPTION_KEY not set in production. Encryption may be insecure!"
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
