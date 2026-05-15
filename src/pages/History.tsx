import React, { useEffect, useState } from 'react';
import PageMeta from '@/components/common/PageMeta';
import { useNavigate } from 'react-router-dom';
import { supabase, checkSupabaseConnection } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Image as ImageIcon,
  Type,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  HistoryIcon,
  Inbox,
} from 'lucide-react';
import type { Document } from '@/types/types';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  uploaded: { label: 'Uploaded', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  processing: { label: 'Processing', color: 'bg-info/10 text-info border-info/20', icon: Clock },
  completed: { label: 'Completed', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
};

const typeIcon = {
  pdf: FileText,
  image: ImageIcon,
  text: Type,
};

const History: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      setError('');

      // Check Supabase connection first
      const connCheck = await checkSupabaseConnection();
      if (!connCheck.ok) {
        setError(`Connection error: ${connCheck.error || 'Cannot connect to database'}. Please check your environment variables.`);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        if (fetchError.code === '42P01') {
          setError('Database tables not found. Please run the SQL setup in your Supabase dashboard (see supabase/migrations folder).');
        } else {
          setError(fetchError.message || 'Failed to load documents');
        }
      } else {
        setDocuments(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    };

    fetchDocuments();
  }, [user]);

  const handleClick = (doc: Document) => {
    if (doc.status === 'completed') {
      navigate('/results', { state: { documentId: doc.id } });
    }
  };

  return (
    <AppLayout>
      <PageMeta
        title="Document History"
        description="View your previously processed documents and their extracted tasks, summaries, and draft replies in ProofDesk AI."
        noindex
      />
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-balance flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-muted-foreground" />
            History
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Previously processed documents and their results.
          </p>
        </div>

        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">All Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                <h3 className="text-base font-medium mb-2">Connection Error</h3>
                <p className="text-sm text-muted-foreground text-pretty max-w-xs mx-auto">
                  {error}
                </p>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-base font-medium mb-1">No documents yet</h3>
                <p className="text-sm text-muted-foreground text-pretty max-w-xs">
                  Process your first document to see it here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {documents.map((doc) => {
                  const status = statusConfig[doc.status] || statusConfig.uploaded;
                  const StatusIcon = status.icon;
                  const TypeIcon = typeIcon[doc.input_type] || FileText;
                  const isClickable = doc.status === 'completed';

                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleClick(doc)}
                      disabled={!isClickable}
                      className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                        isClickable
                          ? 'hover:bg-muted/50 cursor-pointer'
                          : 'cursor-default opacity-70'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()} at{' '}
                          {new Date(doc.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs font-normal shrink-0 ${status.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      {isClickable && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default History;
