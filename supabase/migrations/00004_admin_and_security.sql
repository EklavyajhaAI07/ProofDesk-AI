-- ============================================================
-- ProofDesk AI — Phase 12: Admin & Security Enhancements
-- Adds allowed_users table and admin roles
-- ============================================================

-- 1. Create allowed_users table
CREATE TABLE IF NOT EXISTS allowed_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id)
);

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Only admins can see/modify allowed_users
-- We'll define "admin" as eklavya2227@gmail.com for now
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email = 'eklavya2227@gmail.com'
  );
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage allowed_users') THEN
    CREATE POLICY "Admins can manage allowed_users" ON allowed_users
      FOR ALL TO authenticated USING (is_admin());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can check if they are allowed') THEN
    -- This is needed for the AuthContext check
    CREATE POLICY "Anyone can check if they are allowed" ON allowed_users
      FOR SELECT TO authenticated, anon USING (true);
  END IF;
END $$;

-- 2. Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Update the primary admin
UPDATE profiles SET is_admin = true WHERE email = 'eklavya2227@gmail.com';

-- 3. Fix storage bucket policies to be more restrictive
-- Ensure only the owner can read/write to their folder
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own documents" ON storage.objects;
CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Add email search index
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON allowed_users(email);

-- 5. Add some initial allowed users if table is empty
INSERT INTO allowed_users (email)
VALUES ('eklavya2227@gmail.com')
ON CONFLICT (email) DO NOTHING;
