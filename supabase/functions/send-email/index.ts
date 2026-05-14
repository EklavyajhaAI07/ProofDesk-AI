import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  user_id: string;
  email_type: 'welcome' | 'processing_complete' | 'reminder' | 'other';
  to: string;
  name?: string;
  document_title?: string;
  summary?: string;
  task_count?: number;
}

function getWelcomeEmail(name: string): { subject: string; html: string; text: string } {
  const subject = `Welcome to ProofDesk, ${name}!`;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ProofDesk</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:40px 32px 24px;">
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#111827;letter-spacing:-0.02em;">Welcome to ProofDesk</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hi ${name},</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Thank you for joining ProofDesk. We are excited to help you turn unstructured documents into actionable task lists and draft replies in seconds.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Get started by uploading a PDF, image, or pasting text directly into the dashboard. Our AI will extract tasks, set priorities, and even draft a professional reply for you.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="background:#111827;border-radius:4px;text-align:center;">
              <a href="#" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;">Go to Dashboard</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#6b7280;">If you have any questions, simply reply to this email.</p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">ProofDesk &middot; AI-Powered Document Processing</p>
          <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">This is a transactional email. You received it because you signed up for ProofDesk.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Welcome to ProofDesk, ${name}!

Hi ${name},

Thank you for joining ProofDesk. We are excited to help you turn unstructured documents into actionable task lists and draft replies in seconds.

Get started by uploading a PDF, image, or pasting text directly into the dashboard. Our AI will extract tasks, set priorities, and even draft a professional reply for you.

Go to Dashboard: https://proofdesk.app

If you have any questions, simply reply to this email.

---
ProofDesk - AI-Powered Document Processing
This is a transactional email. You received it because you signed up for ProofDesk.`;

  return { subject, html, text };
}

function getProcessingCompleteEmail(name: string, documentTitle: string, taskCount: number): { subject: string; html: string; text: string } {
  const subject = `Your document "${documentTitle}" has been processed`;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Processed</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:40px 32px 24px;">
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#111827;letter-spacing:-0.02em;">Document Processed</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hi ${name},</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">We have finished processing your document <strong style="color:#111827;">${documentTitle}</strong>.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Our AI extracted <strong style="color:#111827;">${taskCount} action item${taskCount !== 1 ? 's' : ''}</strong> from the document. You can review the summary, tasks, and draft reply on your dashboard.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="background:#111827;border-radius:4px;text-align:center;">
              <a href="#" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;">View Results</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#6b7280;">If you have any questions, simply reply to this email.</p>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">ProofDesk &middot; AI-Powered Document Processing</p>
          <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">This is a transactional email. You received it because you use ProofDesk.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Document Processed

Hi ${name},

We have finished processing your document "${documentTitle}".

Our AI extracted ${taskCount} action item${taskCount !== 1 ? 's' : ''} from the document. You can review the summary, tasks, and draft reply on your dashboard.

View Results: https://proofdesk.app

If you have any questions, simply reply to this email.

---
ProofDesk - AI-Powered Document Processing
This is a transactional email. You received it because you use ProofDesk.`;

  return { subject, html, text };
}

async function sendEmailViaResend(
  resendKey: string,
  payload: EmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fromEmail = 'ProofDesk <onboarding@resend.dev>';

  let content: { subject: string; html: string; text: string };

  switch (payload.email_type) {
    case 'welcome':
      content = getWelcomeEmail(payload.name || 'there');
      break;
    case 'processing_complete':
      content = getProcessingCompleteEmail(
        payload.name || 'there',
        payload.document_title || 'Your document',
        payload.task_count || 0
      );
      break;
    default:
      return { success: false, error: 'Unknown email type' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: payload.to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      reply_to: 'support@proofdesk.app',
      headers: {
        'X-Entity-Ref-ID': payload.user_id,
        'List-Unsubscribe': '<mailto:unsubscribe@proofdesk.app?subject=unsubscribe>',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return { success: false, error: `Resend API error ${response.status}: ${errorBody}` };
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const payload: EmailPayload = await req.json();
    if (!payload.to || !payload.email_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log as queued first
    const { data: logData } = await supabase.from('email_logs').insert({
      user_id: user.id,
      email_type: payload.email_type,
      recipient_email: payload.to,
      subject: '',
      status: 'queued',
    }).select('id').single();

    const logId = logData?.id;

    // Send email
    const result = await sendEmailViaResend(resendKey, payload);

    // Update log
    if (logId) {
      await supabase.from('email_logs').update({
        status: result.success ? 'sent' : 'failed',
        resend_message_id: result.messageId || null,
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
      }).eq('id', logId);
    }

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Send email error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
