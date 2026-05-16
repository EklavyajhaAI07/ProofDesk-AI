export interface Profile {
  id: string;
  email: string;
  name: string | null;
  date_of_birth: string | null;
  work: string | null;
  organization: string | null;
  profile_completed: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  email_verified: boolean;
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

export interface AIGeneration {
  id: string;
  user_id: string;
  prompt: string | null;
  response: string | null;
  file_url: string | null;
  tokens_used: number;
  created_at: string;
  ip_address: string | null;
  generation_status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface AIUsageLimit {
  id: string;
  user_id: string | null;
  ip_address: string | null;
  generation_count: number;
  window_start: string;
  window_end: string;
  blocked_until: string | null;
}

export interface AuthLog {
  id: string;
  user_id: string | null;
  event_type: 'login' | 'logout' | 'signup' | 'password_reset' |
    'failed_login' | 'session_refresh' | 'otp_sent' |
    'otp_verified' | 'account_locked' | 'suspicious_activity';
  ip_address: string | null;
  device_info: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
}
