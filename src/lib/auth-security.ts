/**
 * Auth security utilities — input validation, password strength,
 * device fingerprinting, and anti-abuse helpers.
 */

// ============================================================
// Password Validation
// ============================================================

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'strong' | 'very_strong';
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }
  if (password.length > 128) {
    errors.push('Password must be under 128 characters.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }

  // Common weak passwords blocklist
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'letmein', 'welcome',
    'admin123', 'abc12345', 'password1', '1234567890', 'iloveyou',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger one.');
  }

  let strength: PasswordValidation['strength'] = 'weak';
  const score =
    (password.length >= 12 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  if (score >= 5) strength = 'very_strong';
  else if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'fair';

  return { valid: errors.length === 0, errors, strength };
}

// ============================================================
// Email Validation
// ============================================================

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required.' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long.' };
  }

  // RFC 5322 simplified
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  // Block disposable email domains (basic list)
  const disposableDomains = [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', '10minutemail.com',
    'trashmail.com', 'fakeinbox.com',
  ];
  const domain = trimmed.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { valid: false, error: 'Disposable email addresses are not allowed.' };
  }

  return { valid: true };
}

// ============================================================
// Device Fingerprint (basic, non-invasive)
// ============================================================

export function getDeviceInfo(): string {
  try {
    const info = {
      userAgent: navigator.userAgent.substring(0, 200),
      language: navigator.language,
      platform: navigator.platform,
      screenRes: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    return JSON.stringify(info);
  } catch {
    return 'unknown';
  }
}

// ============================================================
// Rate Limit Tracker (client-side, complementary to server-side)
// ============================================================

const LOGIN_ATTEMPT_KEY = 'proofdesk_login_attempts';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttemptData {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

function getLoginAttempts(): LoginAttemptData {
  try {
    const raw = sessionStorage.getItem(LOGIN_ATTEMPT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { count: 0, firstAttempt: Date.now(), lockedUntil: null };
}

function setLoginAttempts(data: LoginAttemptData): void {
  try {
    sessionStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function recordFailedLogin(): { locked: boolean; remainingAttempts: number; lockoutMinutes?: number } {
  const data = getLoginAttempts();

  // Check if currently locked
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    const remainingMs = data.lockedUntil - Date.now();
    return { locked: true, remainingAttempts: 0, lockoutMinutes: Math.ceil(remainingMs / 60000) };
  }

  // Reset if lockout expired
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    const fresh = { count: 1, firstAttempt: Date.now(), lockedUntil: null };
    setLoginAttempts(fresh);
    return { locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - 1 };
  }

  data.count += 1;

  if (data.count >= MAX_LOGIN_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    setLoginAttempts(data);
    return { locked: true, remainingAttempts: 0, lockoutMinutes: Math.ceil(LOCKOUT_DURATION_MS / 60000) };
  }

  setLoginAttempts(data);
  return { locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - data.count };
}

export function clearLoginAttempts(): void {
  try {
    sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
  } catch { /* ignore */ }
}

export function isLoginLocked(): { locked: boolean; lockoutMinutes?: number } {
  const data = getLoginAttempts();
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    const remainingMs = data.lockedUntil - Date.now();
    return { locked: true, lockoutMinutes: Math.ceil(remainingMs / 60000) };
  }
  return { locked: false };
}

// ============================================================
// Input Sanitization
// ============================================================

export function sanitizeInput(input: string, maxLength = 5000): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '')  // Remove javascript: URIs
    .replace(/on\w+=/gi, '')       // Remove event handlers
    .trim()
    .substring(0, maxLength);
}
