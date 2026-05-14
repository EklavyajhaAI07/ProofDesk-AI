
-- Create profiles table extending auth.users
CREATE TABLE profiles (
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
CREATE TABLE documents (
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
CREATE TABLE document_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  draft_reply TEXT NOT NULL DEFAULT '',
  raw_ai_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  source_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create rate_limits table for edge function
CREATE TABLE rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Document outputs policies
CREATE POLICY "Users can view own outputs" ON document_outputs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_outputs.document_id AND documents.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own outputs" ON document_outputs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_outputs.document_id AND documents.user_id = auth.uid())
  );

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = tasks.document_id AND documents.user_id = auth.uid())
  );

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = tasks.document_id AND documents.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = tasks.document_id AND documents.user_id = auth.uid())
  );

-- Rate limits policies (admin only, edge function uses service role)
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Helper function for profile completion check
CREATE OR REPLACE FUNCTION can_access_documents(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_uuid AND profile_completed = true
  );
$$;
