import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 生產環境務必設定 JWT_SECRET
if (!JWT_SECRET) {
  console.warn('⚠️ 警告: JWT_SECRET 未設定，生產環境必須設定此環境變數！');
}

export function generateToken(payload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET 未設定，無法產生 Token');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}
