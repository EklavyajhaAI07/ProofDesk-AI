import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  task_text: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  source_snippet?: string;
}

interface AIResponse {
  summary: string;
  draft_reply: string;
  tasks: Task[];
}

// Rate limit: 5 requests per hour per user
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function sanitizeInput(text: string): string {
  // Remove common prompt injection patterns
  let sanitized = text;
  // Block attempts to override system instructions
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/gi,
    /forget\s+everything/gi,
    /system\s*:\s*/gi,
    /you\s+are\s+now/gi,
    /new\s+role\s*:/gi,
    /override\s+constraints/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /###\s*system/gi,
    /###\s*assistant/gi,
    /###\s*user/gi,
  ];
  injectionPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '[BLOCKED]');
  });
  // Limit length
  return sanitized.slice(0, 15000);
}

function validateJSONResponse(jsonText: string): AIResponse | null {
  try {
    const parsed = JSON.parse(jsonText);
    if (typeof parsed.summary !== 'string') return null;
    if (typeof parsed.draft_reply !== 'string') return null;
    if (!Array.isArray(parsed.tasks)) return null;

    // Validate each task
    const validTasks: Task[] = [];
    for (const task of parsed.tasks) {
      if (typeof task.task_text !== 'string') continue;
      const priority = ['low', 'medium', 'high'].includes(task.priority)
        ? task.priority
        : 'medium';
      validTasks.push({
        task_text: task.task_text.slice(0, 500),
        due_date: task.due_date || null,
        priority: priority as 'low' | 'medium' | 'high',
        source_snippet: task.source_snippet?.slice(0, 1000) || null,
      });
    }

    return {
      summary: parsed.summary.slice(0, 2000),
      draft_reply: parsed.draft_reply.slice(0, 5000),
      tasks: validTasks,
    };
  } catch {
    return null;
  }
}

async function checkRateLimit(supabase: any, userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const { data: limit, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: false, remaining: 0 };
  }

  if (!limit) {
    // First request, create entry
    await supabase.from('rate_limits').insert({
      user_id: userId,
      request_count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  const windowStart = new Date(limit.window_start);
  const windowElapsed = now.getTime() - windowStart.getTime();

  if (windowElapsed > RATE_WINDOW_MS) {
    // Window expired, reset
    await supabase.from('rate_limits').update({
      request_count: 1,
      window_start: now.toISOString(),
    }).eq('user_id', userId);
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (limit.request_count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  await supabase.from('rate_limits').update({
    request_count: limit.request_count + 1,
  }).eq('user_id', userId);

  return { allowed: true, remaining: RATE_LIMIT - limit.request_count - 1 };
}

// Fallback models to try if primary fails
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'llama3-70b-8192'];

async function callGroqAPI(groqKey: string, messages: any[], model: string, retries = 2): Promise<any> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Groq API error with model ${model}:`, errorText);
    
    // If model not found or overloaded, try fallback
    if (retries > 0 && (response.status === 404 || response.status === 503 || response.status === 429)) {
      const nextModel = GROQ_MODELS.find(m => m !== model);
      if (nextModel) {
        console.log(`Retrying with fallback model: ${nextModel}`);
        return callGroqAPI(groqKey, messages, nextModel, retries - 1);
      }
    }
    
    throw new Error(`AI processing failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!groqKey) {
      console.error('Missing GROQ_API_KEY environment variable');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing AI API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const { allowed, remaining } = await checkRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { document_text, document_id } = await req.json();
    if (!document_text || typeof document_text !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid document text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedText = sanitizeInput(document_text);

    const systemPrompt = `You are a professional document analysis assistant. Extract actionable tasks, summarize documents, and generate professional draft replies.

IMPORTANT RULES:
- Return ONLY valid JSON. No markdown, no explanations, no code blocks.
- If no tasks are found, return an empty tasks array.
- Extract explicit or strongly implied action items only.
- Identify due dates from the document content.
- Assign priority levels (low, medium, high) based on urgency language.

RESPONSE FORMAT (strict JSON):
{
  "summary": "Brief 2-3 sentence summary of the document",
  "draft_reply": "Professional draft response addressing the sender",
  "tasks": [
    {
      "task_text": "Description of the action item",
      "due_date": "YYYY-MM-DD or null if not specified",
      "priority": "low|medium|high",
      "source_snippet": "The relevant text from the document that implies this task"
    }
  ]
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze the following document and extract tasks, summary, and draft reply:\n\n${sanitizedText}` },
    ];

    // Call Groq API with fallback models
    const aiData = await callGroqAPI(groqKey, messages, GROQ_MODELS[0]);
    const aiMessage = aiData.choices?.[0]?.message?.content || '';

    // Try to extract JSON from response (it might be wrapped in markdown code blocks)
    let jsonText = aiMessage;
    const codeBlockMatch = aiMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    const validated = validateJSONResponse(jsonText);
    if (!validated) {
      // Retry with explicit JSON-only prompt
      const retryMessages = [
        { role: 'system', content: 'Return ONLY raw JSON. No markdown. No explanations.' },
        { role: 'user', content: `Extract JSON from this text. If it contains tasks, summary, and draft_reply, format it properly. Document:\n\n${sanitizedText}` },
      ];

      const retryData = await callGroqAPI(groqKey, retryMessages, GROQ_MODELS[0]);
      const retryMessage = retryData.choices?.[0]?.message?.content || '';
      const retryCodeBlockMatch = retryMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
      const retryJsonText = retryCodeBlockMatch ? retryCodeBlockMatch[1].trim() : retryMessage;
      const retryValidated = validateJSONResponse(retryJsonText);

      if (!retryValidated) {
        return new Response(JSON.stringify({ error: 'AI returned invalid format. Please try again.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ...retryValidated, remaining }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ...validated, remaining }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
