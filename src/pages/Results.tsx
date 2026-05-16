import React, { useEffect, useState } from 'react';
import PageMeta from '@/components/common/PageMeta';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import AppLayout from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Send,
  Calendar,
  Flag,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Document, DocumentOutput, Task } from '@/types/types';

const priorityColors = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-success/10 text-success border-success/20',
};

const Results: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { documentId } = location.state || {};

  const [document, setDocument] = useState<Document | null>(null);
  const [output, setOutput] = useState<DocumentOutput | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch document
        const { data: doc, error: docErr } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .maybeSingle();

        if (docErr || !doc) throw new Error('Document not found. Have you run the SQL setup?');
        setDocument(doc);

        // Fetch outputs
        const { data: out } = await supabase
          .from('document_outputs')
          .select('*')
          .eq('document_id', documentId)
          .maybeSingle();
        setOutput(out);

        // Fetch tasks
        const { data: tks } = await supabase
          .from('tasks')
          .select('*')
          .eq('document_id', documentId)
          .order('priority', { ascending: false });

        setTasks(Array.isArray(tks) ? tks : []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load results';
        console.error('Fetch error:', err);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documentId, navigate]);

  const toggleTaskStatus = async (taskId: string, currentStatus: 'open' | 'done') => {
    const newStatus = currentStatus === 'open' ? 'done' : 'open';
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to update task status');
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleSendReply = () => {
    if (output?.draft_reply) {
      navigator.clipboard.writeText(output.draft_reply);
      toast.success('Draft reply copied to clipboard');
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'done').length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageMeta
        title="Results — Task Extraction Complete"
        description="View extracted tasks, document summary, and AI-generated draft reply from your processed document in ProofDesk AI."
        noindex
      />
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" className="w-fit gap-2" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-balance truncate">
              {document?.title || 'Processing Results'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {document?.created_at ? new Date(document.created_at).toLocaleString() : ''}
            </p>
          </div>
          {tasks.length > 0 && (
            <Badge variant="outline" className="w-fit shrink-0 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {completedCount} / {tasks.length} completed
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Summary + Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Card */}
            {output?.summary && (
              <Card className="border border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed text-pretty">{output.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Tasks Card */}
            <Card className="border border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  Action Items ({tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No tasks detected in this document.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          task.status === 'done'
                            ? 'bg-muted/30 border-border'
                            : 'bg-card border-border'
                        }`}
                      >
                        <Checkbox
                          checked={task.status === 'done'}
                          onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium leading-relaxed ${
                              task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {task.task_text}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className={`text-xs font-normal ${priorityColors[task.priority]}`}
                            >
                              {task.priority}
                            </Badge>
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Draft Reply */}
          <div className="lg:col-span-1">
            <Card className="border border-border shadow-none sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  Draft Reply
                </CardTitle>
                <CardDescription className="text-xs text-pretty">
                  AI-generated response based on the document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] rounded-md border border-border p-3 bg-muted/20">
                  {output?.draft_reply ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed text-pretty">
                      {output.draft_reply}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No draft reply generated.</p>
                  )}
                </ScrollArea>
                <Button
                  onClick={handleSendReply}
                  disabled={!output?.draft_reply}
                  className="w-full mt-4 h-10"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Results;
