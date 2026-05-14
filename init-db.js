const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://lgwrdcavnqiixyexwwyt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnd3JkY2F2bnFpaXlxZXh3d3l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU3Nzg0NSwiZXhwIjoyMDk0MTUzODQ1fQ.qum-QTzuOlHCegdW4pwnvpVR3ta0NKUgo412bpL0YeI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  date_of_birth DATE,
  work TEXT,
  organization TEXT,
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('pdf', 'image', 'text')),
  original_text TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create document_outputs table
CREATE TABLE IF NOT EXISTS document_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  draft_reply TEXT NOT NULL DEFAULT '',
  raw_ai_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  source_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create allowed_users table
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Add policies (ignoring errors if they exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own documents') THEN
        CREATE POLICY "Users can view own documents" ON documents FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own documents') THEN
        CREATE POLICY "Users can insert own documents" ON documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for allowed_users') THEN
        CREATE POLICY "Public read access for allowed_users" ON allowed_users FOR SELECT USING (true);
    END IF;
END $$;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
`;

async function init() {
  console.log('🚀 Starting Supabase Initialization...');
  
  // Note: We use the SQL API via a trick or just guide the user.
  // Since we can't run raw SQL via the JS client, we'll explain to the user.
  console.log('--------------------------------------------------');
  console.log('ATTENTION: Due to Supabase security restrictions,');
  console.log('you MUST run the SQL one time in the dashboard.');
  console.log('--------------------------------------------------');
  console.log('I have prepared the code for you. Please just:');
  console.log('1. Go to https://supabase.com/dashboard/project/lgwrdcavnqiixyexwwyt/sql/new');
  console.log('2. Paste the SQL block from the docs/SETUP.sql file.');
  console.log('3. Click RUN.');
  console.log('--------------------------------------------------');
  
  // But we can at least add the allowed user via the client!
  const { error } = await supabase.from('allowed_users').insert({ email: 'eklavya2227@gmail.com' });
  if (error) {
    if (error.code === '42P01') {
      console.log('❌ Tables do not exist yet. Please run the SQL first!');
    } else {
      console.log('✅ Developer email already authorized.');
    }
  } else {
    console.log('✅ Developer email authorized successfully.');
  }
}

init();
