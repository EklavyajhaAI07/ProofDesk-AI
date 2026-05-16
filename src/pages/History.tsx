import React, { useEffect, useState, useMemo, useCallback } from 'react';
import PageMeta from '@/components/common/PageMeta';
import { useNavigate } from 'react-router-dom';
import { supabase, checkSupabaseConnection } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Image as ImageIcon,
  Type,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  HistoryIcon,
  Inbox,
  Search,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Document } from '@/types/types';

const ITEMS_PER_PAGE = 10;

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  // Filtered & paginated documents
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(query) ||
      doc.input_type.toLowerCase().includes(query) ||
      doc.status.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE));
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocuments, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleClick = (doc: Document) => {
    if (doc.status === 'completed') {
      navigate('/results', { state: { documentId: doc.id } });
    }
  };

  const handleDelete = useCallback(async (docId: string) => {
    setDeletingId(docId);
    try {
      // Get the document to check for file_path
      const doc = documents.find(d => d.id === docId);

      // Delete associated tasks first
      await supabase.from('tasks').delete().eq('document_id', docId);
      // Delete associated outputs
      await supabase.from('document_outputs').delete().eq('document_id', docId);

      // Delete the document file from storage if it exists
      if (doc?.file_path) {
        await supabase.storage.from('documents').remove([doc.file_path]);
      }

      // Delete the document record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (deleteError) {
        toast.error(`Failed to delete: ${deleteError.message}`);
      } else {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        toast.success('Document deleted successfully');
      }
    } catch (err) {
      toast.error('Failed to delete document');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  }, [documents]);

  const handleDownload = useCallback(async (doc: Document) => {
    if (!doc.file_path) {
      toast.error('No file available for download');
      return;
    }

    setDownloadingId(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 60); // 60 seconds expiry

      if (error || !data?.signedUrl) {
        toast.error('Failed to generate download link');
        return;
      }

      // Open signed URL in new tab for download
      window.open(data.signedUrl, '_blank');
      toast.success('Download started');
    } catch (err) {
      toast.error('Download failed');
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  }, []);

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

        {/* Search Bar */}
        {!loading && !error && documents.length > 0 && (
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents by name, type, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        )}

        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>All Documents</span>
              {!loading && filteredDocuments.length > 0 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
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
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-base font-medium mb-1">
                  {searchQuery ? 'No results found' : 'No documents yet'}
                </h3>
                <p className="text-sm text-muted-foreground text-pretty max-w-xs">
                  {searchQuery
                    ? 'Try adjusting your search terms.'
                    : 'Process your first document to see it here.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {paginatedDocuments.map((doc) => {
                  const status = statusConfig[doc.status] || statusConfig.uploaded;
                  const StatusIcon = status.icon;
                  const TypeIcon = typeIcon[doc.input_type] || FileText;
                  const isClickable = doc.status === 'completed';
                  const isDeleting = deletingId === doc.id;
                  const isDownloading = downloadingId === doc.id;

                  return (
                    <div key={doc.id} className="flex items-center gap-3 p-4 group">
                      <button
                        onClick={() => handleClick(doc)}
                        disabled={!isClickable}
                        className={`flex items-center gap-3 flex-1 min-w-0 text-left transition-colors ${
                          isClickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default opacity-70'
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
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-xs font-normal ${status.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>

                        {/* Download button */}
                        {doc.file_path && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                            disabled={isDownloading}
                            title="Download file"
                          >
                            {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          </Button>
                        )}

                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              disabled={isDeleting}
                              title="Delete document"
                            >
                              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{doc.title}" and all associated tasks, outputs, and files. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(doc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {isClickable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default History;
