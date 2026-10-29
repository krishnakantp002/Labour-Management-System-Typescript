import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database';
import { config } from '../../config';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schema';
import { v4 as uuidv4 } from 'uuid';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
}

export async function registerUser(input: RegisterInput) {
  const existing = await query<UserRow>('SELECT id FROM users WHERE email = ?', [input.email]);
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Email already exists'), { statusCode: 400 });
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const id = uuidv4();
  await query(
    `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
    [id, input.name, input.email, hashedPassword]
  );
  
  const inserted = await query<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  const user = inserted.rows[0];
  const { password_hash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function loginUser(input: LoginInput) {
  const result = await query<UserRow>('SELECT * FROM users WHERE email = ?', [input.email]);
  const user = result.rows[0];

  if (!user || !user.is_active) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const isMatch = await bcrypt.compare(input.password, user.password_hash);
  if (!isMatch) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  const { password_hash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

export async function getUserProfile(id: string) {
  const result = await query<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  const user = result.rows[0];
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  const { password_hash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function changePassword(id: string, input: ChangePasswordInput) {
  const result = await query<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  const user = result.rows[0];
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const isMatch = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!isMatch) {
    throw Object.assign(new Error('Incorrect old password'), { statusCode: 400 });
  }

  const hashedNewPassword = await bcrypt.hash(input.newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedNewPassword, id]);

  return { success: true };
}

export async function refreshAccessToken(refreshToken: string) {
  // Not implemented completely, placeholder
  throw Object.assign(new Error('Refresh not implemented'), { statusCode: 400 });
}
