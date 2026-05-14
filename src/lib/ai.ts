import { supabase } from '@/db/supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

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

export async function processDocumentLocally(text: string): Promise<AIResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured in .env');
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

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze the following document and extract tasks, summary, and draft reply:\n\n${sanitizedText}` },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error:', errorText);
    throw new Error('AI processing failed. Please check your API key and connection.');
  }

  const aiData = await response.json();
  const aiMessage = aiData.choices?.[0]?.message?.content || '';

  let jsonText = aiMessage;
  const codeBlockMatch = aiMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  const validated = validateJSONResponse(jsonText);
  if (!validated) {
    throw new Error('AI returned an invalid response format. Please try again.');
  }

  return validated;
}
