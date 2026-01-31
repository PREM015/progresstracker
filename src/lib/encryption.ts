/* eslint-disable import/no-anonymous-default-export */
// src/lib/encryption.ts
import crypto from 'crypto';

// Environment variables for encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Validates that encryption key is properly configured
 */
function validateEncryptionKey(): string {
  if (!ENCRYPTION_KEY) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  // Key should be 64 hex characters (32 bytes)
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes). ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  return ENCRYPTION_KEY;
}

/**
 * Derives a key from the master key using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  const masterKey = validateEncryptionKey();
  return crypto.pbkdf2Sync(
    Buffer.from(masterKey, 'hex'),
    salt,
    100000, // iterations
    32, // key length
    'sha256'
  );
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns: salt:iv:authTag:encryptedData (all hex encoded)
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty text');
  }

  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from master key
    const key = deriveKey(salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine: salt:iv:authTag:encrypted
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted,
    ].join(':');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts a string encrypted with the encrypt function
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty text');
  }

  try {
    // Parse the encrypted text
    const parts = encryptedText.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted text format');
    }

    const [saltHex, ivHex, authTagHex, encrypted] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Derive key from master key
    const key = deriveKey(salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Simple encryption for less sensitive data (backwards compatible)
 * Uses AES-256-CBC
 */
export function encryptSimple(text: string): string {
  if (!text) return '';

  const key = validateEncryptionKey();
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Simple decryption for less sensitive data (backwards compatible)
 */
export function decryptSimple(text: string): string {
  if (!text) return '';

  try {
    const key = validateEncryptionKey();
    const parts = text.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Hash a value (one-way, for backup codes, etc.)
 */
export function hashValue(value: string): string {
  if (!value) {
    throw new Error('Cannot hash empty value');
  }

  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(value, salt, 100000, 64, 'sha512');
  
  return salt.toString('hex') + ':' + hash.toString('hex');
}

/**
 * Verify a value against its hash
 */
export function verifyHash(value: string, hashedValue: string): boolean {
  if (!value || !hashedValue) return false;

  try {
    const parts = hashedValue.split(':');
    if (parts.length !== 2) return false;

    const salt = Buffer.from(parts[0], 'hex');
    const originalHash = parts[1];

    const hash = crypto.pbkdf2Sync(value, salt, 100000, 64, 'sha512');
    
    return crypto.timingSafeEqual(
      Buffer.from(hash.toString('hex')),
      Buffer.from(originalHash)
    );
  } catch {
    return false;
  }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random string (alphanumeric)
 */
export function generateRandomString(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Generate a short code (for backup codes, verification, etc.)
 */
export function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  const bytes = crypto.randomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Hash password for storage (uses bcrypt-like approach with crypto)
 * For actual password hashing, prefer bcryptjs
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32);
  const hash = crypto.scryptSync(password, salt, 64);
  return salt.toString('hex') + ':' + hash.toString('hex');
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const parts = hashedPassword.split(':');
    if (parts.length !== 2) return false;

    const salt = Buffer.from(parts[0], 'hex');
    const originalHash = Buffer.from(parts[1], 'hex');

    const hash = crypto.scryptSync(password, salt, 64);
    
    return crypto.timingSafeEqual(hash, originalHash);
  } catch {
    return false;
  }
}

/**
 * Encrypt JSON object
 */
export function encryptJSON<T extends object>(data: T): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt to JSON object
 */
export function decryptJSON<T extends object>(encryptedData: string): T {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted) as T;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data) return '';
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.slice(0, visibleChars);
  const end = data.slice(-visibleChars);
  const masked = '*'.repeat(Math.min(data.length - visibleChars * 2, 8));
  
  return `${start}${masked}${end}`;
}

/**
 * Check if a string looks like encrypted data
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  
  // Check for our encryption format: salt:iv:authTag:data (GCM)
  const gcmParts = text.split(':');
  if (gcmParts.length === 4) {
    // Validate hex format
    return gcmParts.every(part => /^[0-9a-fA-F]+$/.test(part));
  }
  
  // Check for simple format: iv:data (CBC)
  const cbcParts = text.split(':');
  if (cbcParts.length === 2) {
    return cbcParts.every(part => /^[0-9a-fA-F]+$/.test(part));
  }
  
  return false;
}

// Type exports
export type EncryptedString = string & { readonly __encrypted: unique symbol };

// Default export for convenience
export default {
  encrypt,
  decrypt,
  encryptSimple,
  decryptSimple,
  hashValue,
  verifyHash,
  generateSecureToken,
  generateRandomString,
  generateShortCode,
  hashPassword,
  verifyPassword,
  encryptJSON,
  decryptJSON,
  maskSensitiveData,
  isEncrypted,
};