import { supabase } from '@/db/supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Validate API key at module load
if (!GROQ_API_KEY) {
  console.error('[AI] GROQ_API_KEY is not configured in .env file. AI processing will fail.');
}

// Fallback models in case primary model is unavailable
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'mixtral-8x7b-32768',
  'llama3-70b-8192'
];

export interface Task {
  task_text: string;
  due_date?: string | null;
  priority: 'low' | 'medium' | 'high';
  source_snippet?: string | null;
}

export interface AIResponse {
  summary: string;
  draft_reply: string;
  tasks: Task[];
}

function sanitizeInput(text: string): string {
  let sanitized = text;
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
  return sanitized.slice(0, 15000);
}

function validateJSONResponse(jsonText: string): AIResponse | null {
  try {
    const parsed = JSON.parse(jsonText);
    if (typeof parsed.summary !== 'string') return null;
    if (typeof parsed.draft_reply !== 'string') return null;
    if (!Array.isArray(parsed.tasks)) return null;

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

async function callGroqAPI(model: string, messages: any[], retries = 2): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] Groq API error with model ${model}:`, errorText);

      // If model not found or overloaded, try fallback
      if (retries > 0 && (response.status === 404 || response.status === 503 || response.status === 429)) {
        const nextModel = GROQ_MODELS.find(m => m !== model);
        if (nextModel) {
          console.warn(`[AI] Retrying with fallback model: ${nextModel}`);
          return callGroqAPI(nextModel, messages, retries - 1);
        }
      }

      throw new Error(`AI processing failed (${response.status}). Please check your API key and connection.`);
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function processDocumentLocally(text: string): Promise<AIResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured in .env file. Please add your API key and restart the server.');
  }

  const sanitizedText = sanitizeInput(text);

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

  try {
    const aiData = await callGroqAPI(GROQ_MODELS[0], messages);
    const aiMessage = aiData.choices?.[0]?.message?.content || '';

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

      const retryData = await callGroqAPI(GROQ_MODELS[0], retryMessages);
      const retryMessage = retryData.choices?.[0]?.message?.content || '';
      const retryCodeBlockMatch = retryMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
      const retryJsonText = retryCodeBlockMatch ? retryCodeBlockMatch[1].trim() : retryMessage;
      const retryValidated = validateJSONResponse(retryJsonText);

      if (!retryValidated) {
        throw new Error('AI returned an invalid response format after retry. Please try again.');
      }

      return retryValidated;
    }

    return validated;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('AI processing timed out (60s). Please try with a shorter text or check your connection.');
    }
    throw err;
  }
}
