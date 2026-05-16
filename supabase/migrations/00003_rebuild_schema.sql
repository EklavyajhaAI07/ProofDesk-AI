-- ============================================================
-- ProofDesk AI — Phase 2: Rebuild Schema
-- Adds new tables from debugtasklist.md requirements
-- Preserves all existing tables (profiles, documents, etc.)
-- ============================================================

-- ============================================================
-- 1. users_profile table (extended profile data)
-- ============================================================
CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_verified BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own users_profile') THEN
    CREATE POLICY "Users can view own users_profile" ON users_profile
      FOR SELECT TO authenticated USING (id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own users_profile') THEN
    CREATE POLICY "Users can update own users_profile" ON users_profile
      FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own users_profile') THEN
    CREATE POLICY "Users can insert own users_profile" ON users_profile
      FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 2. ai_generations table (tracks all AI generation events)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT,
  response TEXT,
  file_url TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed'))
);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own ai_generations') THEN
    CREATE POLICY "Users can view own ai_generations" ON ai_generations
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own ai_generations') THEN
    CREATE POLICY "Users can insert own ai_generations" ON ai_generations
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 3. ai_usage_limits table (rate limiting per user and IP)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  generation_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  blocked_until TIMESTAMPTZ,
  UNIQUE(user_id),
  UNIQUE(ip_address)
);

ALTER TABLE ai_usage_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own ai_usage_limits') THEN
    CREATE POLICY "Users can view own ai_usage_limits" ON ai_usage_limits
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 4. auth_logs table (security event tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login', 'logout', 'signup', 'password_reset',
    'failed_login', 'session_refresh', 'otp_sent',
    'otp_verified', 'account_locked', 'suspicious_activity'
  )),
  ip_address INET,
  device_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own auth_logs') THEN
    CREATE POLICY "Users can view own auth_logs" ON auth_logs
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 5. user_sessions table (session management)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own sessions') THEN
    CREATE POLICY "Users can view own sessions" ON user_sessions
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own sessions') THEN
    CREATE POLICY "Users can delete own sessions" ON user_sessions
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 6. Add missing delete policies to existing tables
-- ============================================================
DO $$
BEGIN
  -- Documents delete policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own documents') THEN
    CREATE POLICY "Users can delete own documents" ON documents
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;

  -- Document outputs delete policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own outputs') THEN
    CREATE POLICY "Users can delete own outputs" ON document_outputs
      FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = document_outputs.document_id AND documents.user_id = auth.uid())
      );
  END IF;

  -- Tasks delete policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own tasks') THEN
    CREATE POLICY "Users can delete own tasks" ON tasks
      FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = tasks.document_id AND documents.user_id = auth.uid())
      );
  END IF;

  -- Documents update policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own documents') THEN
    CREATE POLICY "Users can update own documents" ON documents
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 7. Add indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_document_id ON tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_document_outputs_document_id ON document_outputs(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_user_id ON ai_usage_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_ip ON ai_usage_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);

-- ============================================================
-- 8. Auto-create profile on user signup trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profile (id, email, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. Cleanup function for expired sessions
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$;

-- ============================================================
-- 10. Rate limit reset function
-- ============================================================
CREATE OR REPLACE FUNCTION reset_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_usage_limits
  SET generation_count = 0,
      window_start = NOW(),
      window_end = NOW() + INTERVAL '1 hour',
      blocked_until = NULL
  WHERE window_end < NOW();
END;
$$;
