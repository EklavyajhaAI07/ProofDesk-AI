export interface Profile {
  id: string;
  email: string;
  name: string | null;
  date_of_birth: string | null;
  work: string | null;
  organization: string | null;
  profile_completed: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  input_type: 'pdf' | 'image' | 'text';
  original_text: string | null;
  file_path: string | null;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface DocumentOutput {
  id: string;
  document_id: string;
  summary: string;
  draft_reply: string;
  raw_ai_json: Record<string, unknown> | null;
  created_at: string;
}

export interface Task {
  id: string;
  document_id: string;
  task_text: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'done';
  source_snippet: string | null;
  created_at: string;
}

export interface ProcessResult {
  summary: string;
  draft_reply: string;
  tasks: Array<{
    task_text: string;
    due_date?: string;
    priority: 'low' | 'medium' | 'high';
    source_snippet?: string;
  }>;
  remaining?: number;
}
