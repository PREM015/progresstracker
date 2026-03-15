import { createHmac, randomBytes } from 'crypto';

// Custom TOTP implementation since otplib has ESM issues
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/=+$/, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTOTP(secret: string, time: number = Date.now()): string {
  const counter = Math.floor(time / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const decodedSecret = base32Decode(secret);
  const hmac = createHmac('sha1', decodedSecret);
  hmac.update(counterBuffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

export const authenticator = {
  generateSecret(): string {
    const buffer = randomBytes(20);
    return base32Encode(buffer);
  },

  generate(secret: string): string {
    return generateTOTP(secret);
  },

  verify({ token, secret }: { token: string; secret: string }): boolean {
    const currentTime = Date.now();
    
    // Check current time window and ±1 window for clock drift
    for (let i = -1; i <= 1; i++) {
      const time = currentTime + i * 30000;
      const expectedToken = generateTOTP(secret, time);
      if (token === expectedToken) {
        return true;
      }
    }
    
    return false;
  },

  check(token: string, secret: string): boolean {
    return this.verify({ token, secret });
  },

  keyuri(user: string, service: string, secret: string): string {
    const encodedUser = encodeURIComponent(user);
    const encodedService = encodeURIComponent(service);
    return `otpauth://totp/${encodedService}:${encodedUser}?secret=${secret}&issuer=${encodedService}&algorithm=SHA1&digits=6&period=30`;
  }
};

export default authenticator;
