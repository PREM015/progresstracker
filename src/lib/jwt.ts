// src/lib/jwt.ts
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'supersecret';
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // Access token lifetime

type JwtPayload = {
  userId: string;
  role: string;
  email?: string;
};

export function signJwt(payload: JwtPayload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
