import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/types';
import {
  recordFailedLogin,
  clearLoginAttempts,
  isLoginLocked,
  validateEmail,
  validatePassword,
  getDeviceInfo,
} from '@/lib/auth-security';

export async function getProfile(userId: string, email?: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Profiles table may be missing, providing virtual profile for developer if applicable.');
    if (email === 'eklavya2227@gmail.com') {
      return {
        id: userId,
        email: email,
        name: 'Developer Admin',
        profile_completed: true,
        is_admin: true,
        created_at: new Date().toISOString()
      } as Profile;
    }
    return null;
  }
  return data;
}

// Check if user's email is in allowed_users table
export async function checkAllowedUser(email: string | undefined): Promise<{ allowed: boolean; error?: string }> {
  if (!email) return { allowed: false, error: 'No email provided' };

  try {
    const { data, error } = await supabase
      .from('allowed_users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Allowed users check error:', error.message);
      return { allowed: false, error: error.message };
    }

    return { allowed: !!data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Allowed users check exception:', message);
    return { allowed: false, error: message };
  }
}

// Log authentication events (non-blocking)
async function logAuthEvent(
  userId: string | null,
  eventType: string,
  _deviceInfo?: string
): Promise<void> {
  try {
    await supabase.from('auth_logs').insert({
      user_id: userId,
      event_type: eventType,
      device_info: _deviceInfo || getDeviceInfo(),
    });
  } catch {
    // Non-blocking — don't break auth flow
  }
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ data: unknown; error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const profileData = await getProfile(user.id, user.email);
    setProfile(profileData);
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id, session.user.email).then(setProfile);
        }
      })
      .catch((err) => {
        console.error('Session error:', err);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id, session.user.email).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Check client-side lockout
      const lockCheck = isLoginLocked();
      if (lockCheck.locked) {
        return {
          error: new Error(
            `Too many failed login attempts. Please try again in ${lockCheck.lockoutMinutes} minutes.`
          )
        };
      }

      // Validate email format
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        return { error: new Error(emailCheck.error || 'Invalid email.') };
      }

      // Validate password minimum
      if (password.length < 6) {
        return { error: new Error('Password must be at least 6 characters.') };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const result = recordFailedLogin();
        await logAuthEvent(null, 'failed_login');

        if (result.locked) {
          return {
            error: new Error(
              `Too many failed attempts. Account locked for ${result.lockoutMinutes} minutes.`
            )
          };
        }

        return {
          error: new Error(
            `${error.message}${result.remainingAttempts <= 2 ? ` (${result.remainingAttempts} attempts remaining)` : ''}`
          )
        };
      }

      // Check allowed_users immediately after successful sign in
      if (data.user?.email) {
        const { allowed, error: allowedError } = await checkAllowedUser(data.user.email);
        if (!allowed) {
          await supabase.auth.signOut();
          return {
            error: new Error(
              allowedError === 'No email provided'
                ? 'Access Denied: Your email is not authorized.'
                : 'Access Denied: Your email is not authorized. Please contact the administrator.'
            )
          };
        }
      }

      // Successful login
      clearLoginAttempts();
      await logAuthEvent(data.user?.id ?? null, 'login');

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // Validate email
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        return { data: null, error: new Error(emailCheck.error || 'Invalid email.') };
      }

      // Validate password strength
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return { data: null, error: new Error(pwCheck.errors.join(' ')) };
      }

      // Check if email is in allowed_users before allowing sign up
      const { allowed } = await checkAllowedUser(email);
      if (!allowed) {
        return {
          data: null,
          error: new Error('This email is not authorized to sign up. Please contact the administrator.')
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      if (error) throw error;

      // Log signup event
      await logAuthEvent(data.user?.id ?? null, 'signup');

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  };

  const signOut = async () => {
    if (user) {
      await logAuthEvent(user.id, 'logout');
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        return { error: new Error(emailCheck.error || 'Invalid email.') };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });

      if (error) throw error;

      await logAuthEvent(null, 'password_reset');

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) {
        return { error: new Error(pwCheck.errors.join(' ')) };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      await logAuthEvent(user?.id ?? null, 'otp_verified');

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user, profile, loading,
        signIn, signUp, signOut,
        refreshProfile, resetPassword,
        updatePassword, verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
