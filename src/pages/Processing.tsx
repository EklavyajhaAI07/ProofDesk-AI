import React, { useEffect, useState } from 'react';
import PageMeta from '@/components/common/PageMeta';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import AppLayout from '@/components/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileSearch, ListChecks, PenLine, AlertCircle } from 'lucide-react';
import { processDocumentLocally } from '@/lib/ai';
import { useAuth } from '@/contexts/AuthContext';

const steps = [
  { label: 'Reading document', icon: FileSearch },
  { label: 'Finding tasks', icon: ListChecks },
  { label: 'Preparing draft reply', icon: PenLine },
];

const Processing: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { documentId, documentText } = location.state || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!documentId || !documentText) {
      navigate('/');
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    const process = async () => {
      try {
        let data;

        // Update document status to processing immediately
        const { error: statusError } = await supabase
          .from('documents')
          .update({ status: 'processing' })
          .eq('id', documentId);

        if (statusError) {
          console.error('Status update error:', statusError);
        }

        // Try Edge Function first with a timeout
        let fnData = null;
        let fnError = null;

        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Edge Function timeout')), 25000)
          );
          const invokePromise = supabase.functions.invoke('process-document', {
            body: { document_text: documentText, document_id: documentId },
          });
          const result = (await Promise.race([invokePromise, timeoutPromise])) as any;
          fnData = result.data;
          fnError = result.error;
        } catch (timeoutErr: any) {
          fnError = { message: timeoutErr.message || 'Edge Function call timed out' };
        }

        if (fnError) {
          console.warn('Edge Function failed or not deployed, falling back to local processing:', fnError);
          data = await processDocumentLocally(documentText);
        } else {
          data = fnData;
        }

        if (!data) {
          throw new Error('Processing failed to return data');
        }

        // Save results to database
        const { error: outputError } = await supabase.from('document_outputs').insert({
          document_id: documentId,
          summary: data.summary,
          draft_reply: data.draft_reply,
          raw_ai_json: data,
        });

        if (outputError) {
          console.error('Output save error:', outputError);
          // Show warning but don't fail entirely if DB insert fails
          if (outputError.code === '23503') {
            console.error('Foreign key constraint failed - document may not exist');
          }
        }

        // Save tasks
        if (data.tasks && data.tasks.length > 0) {
          const tasksToInsert = data.tasks.map((task: any) => ({
            document_id: documentId,
            task_text: task.task_text,
            due_date: task.due_date || null,
            priority: task.priority,
            status: 'open',
            source_snippet: task.source_snippet || null,
          }));

          const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
          if (tasksError) {
            console.error('Tasks save error:', tasksError);
          }
        }

        // Update document status to completed
        const { error: updateError } = await supabase
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', documentId);

        if (updateError) {
          console.error('Final status update error:', updateError);
        }

        // Send processing complete email (non-blocking)
        try {
          const { data: docData } = await supabase
            .from('documents')
            .select('title, user_id')
            .eq('id', documentId)
            .single();

          const { data: userData } = await supabase.auth.getUser();
          if (userData.user?.email) {
            await supabase.functions.invoke('send-email', {
              body: {
                email_type: 'processing_complete',
                to: userData.user.email,
                name: userData.user.email.split('@')[0],
                document_title: docData?.title || 'Your document',
                task_count: data.tasks?.length || 0,
              },
            });
          }
        } catch {
          // Non-blocking: don't fail if email fails
        }

        // Navigate to results
        navigate('/results', { state: { documentId } });
      } catch (err: any) {
        clearInterval(interval);
        console.error('Processing error:', err);
        setError(err.message || 'Processing failed. Please try again.');
        // Update document status to failed
        await supabase.from('documents').update({ status: 'failed' }).eq('id', documentId);
      }
    };

    process();

    return () => clearInterval(interval);
  }, [documentId, documentText, navigate]);

  return (
    <AppLayout>
      <PageMeta
        title="Processing Document"
        description="Your document is being analyzed by ProofDesk AI to extract tasks, deadlines, and generate a professional draft reply."
        noindex
      />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md">
          {error ? (
            <Card className="border border-border shadow-none">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-medium mb-2 text-balance">Processing Failed</h2>
                <p className="text-sm text-muted-foreground mb-6 text-pretty">{error}</p>
                <button
                  onClick={() => navigate('/')}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Return to Dashboard
                </button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border shadow-none">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-8">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                </div>

                <h2 className="text-lg font-medium text-center mb-6 text-balance">Processing Document</h2>

                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isDone = index < currentStep;

                    return (
                      <div
                        key={step.label}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isActive ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isDone
                              ? 'bg-primary text-primary-foreground'
                              : isActive
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isDone ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            isActive ? 'text-foreground' : isDone ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Processing;
