import React, { useState, useRef, useCallback, useEffect } from 'react';
import PageMeta from '@/components/common/PageMeta';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, checkSupabaseConnection } from '@/db/supabase';
import AppLayout from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Wand2,
  Sparkles,
  X,
  FileUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { extractTextFromFile } from '@/lib/document-parser';
import { checkClientRateLimit } from '@/lib/ai';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [rateLimit, setRateLimit] = useState(() => checkClientRateLimit());

  // Refresh rate limit display periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimit(checkClientRateLimit());
    }, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    setError('');
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file format. Please upload PDF or image files.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      return;
    }
    setUploadedFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleTextPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    const hasImage = Array.from(clipboardData.items).some(item => item.type.startsWith('image/'));

    if (hasImage) {
      e.preventDefault();
      toast.error('Image paste is not supported. Please upload the image file using the upload button above, or paste text only.');
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileType = (file: File): 'pdf' | 'image' | 'text' => {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'text';
  };

  const processDocument = async () => {
    setError('');

    // Check client rate limit
    const rateCheck = checkClientRateLimit();
    if (!rateCheck.allowed) {
      setError(`Rate limit exceeded. Try again in ${rateCheck.resetInMinutes} minutes.`);
      return;
    }

    // Verify Supabase connection before starting
    const connCheck = await checkSupabaseConnection();
    if (!connCheck.ok) {
      setError(`Connection error: ${connCheck.error || 'Unable to connect to database'}`);
      return;
    }

    let documentText = textInput.trim();
    let filePath: string | null = null;
    let inputType: 'pdf' | 'image' | 'text' = 'text';
    let title = 'Text Input';

    if (uploadedFile) {
      inputType = getFileType(uploadedFile);
      title = uploadedFile.name;

      setIsProcessing(true);
      setError('Extracting text from file...');

      try {
        documentText = await extractTextFromFile(uploadedFile);
        setError('');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        console.error('Upload error:', err);
        toast.error(errorMessage);
        setIsProcessing(false);
        return;
      }

      setError('');

      // Upload file to Supabase Storage
      const path = `${user!.id}/${crypto.randomUUID()}_${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, uploadedFile, { contentType: uploadedFile.type });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Continue even if storage fails - the text is the important part
        if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          console.warn('Storage bucket may not exist, continuing without file storage');
        } else {
          setError(`Failed to upload file: ${uploadError.message}`);
          setIsProcessing(false);
          return;
        }
      } else {
        filePath = path;
      }
    } else if (!documentText) {
      setError('Please upload a file or paste some text to process.');
      return;
    }

    setIsProcessing(true);

    // Create document record in database
    const { data: realDocData, error: realDocError } = await supabase
      .from('documents')
      .insert({
        user_id: user!.id,
        title,
        input_type: inputType,
        original_text: documentText.substring(0, 10000),
        file_path: filePath,
        status: 'uploaded',
      })
      .select()
      .single();

    if (realDocError || !realDocData) {
      console.error('Document creation error:', realDocError);
      setError(
        realDocError?.code === '42P01'
          ? 'Database tables not found. Please run the SQL setup in Supabase dashboard.'
          : `Failed to create document record: ${realDocError?.message || 'Unknown error'}`
      );
      setIsProcessing(false);
      return;
    }

    const documentId = realDocData.id;

    // Navigate to processing page with document info
    navigate('/processing', { state: { documentId, documentText } });
  };

  const loadSample = () => {
    const sampleText = `Hi Sarah,

Thanks for the update on the project. Just a few things to address before we can move forward:

1. Could you please send the revised wireframes by this Friday (May 16)? The team needs them for the sprint planning on Monday.
2. We also need the updated API documentation for the payment module — the client is pushing hard on this and wants it by May 20.
3. There's a bug in the login flow that needs urgent attention. Can you prioritize this and push a fix by tomorrow?
4. Don't forget to schedule the weekly review call for Thursday at 3 PM.
5. The Q2 budget report needs your sign-off before end of month.

Let me know if anything is unclear.

Best,
Mark`;
    setTextInput(sampleText);
    setError('');
    toast.success('Sample text loaded');
  };

  return (
    <AppLayout>
      <PageMeta
        title="Dashboard — Process Documents"
        description="Upload PDFs, images, or paste text to extract actionable tasks with deadlines and priorities. AI-powered document processing by ProofDesk."
        canonical="https://proofdesk.ai/"
      />
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-balance">Process a Document</h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Upload a PDF or image, or paste text to extract tasks and generate a draft reply.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 border border-destructive/20 bg-destructive/5">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* File Upload */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                Upload File
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!uploadedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG up to 10MB</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
                  {uploadedFile.type.startsWith('image/') ? (
                    <ImageIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OR Separator */}
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground font-medium">OR</span>
            <Separator className="flex-1" />
          </div>

          {/* Text Input */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Paste Text
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste an email, message, or document text here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onPaste={handleTextPaste}
                className="min-h-[180px] resize-none px-3 py-2 text-sm"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-3">
            <Button
              onClick={processDocument}
              disabled={isProcessing || (!uploadedFile && !textInput.trim())}
              className="flex-1 h-11"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Process with ProofDesk
            </Button>
            <Button
              variant="outline"
              onClick={loadSample}
              disabled={isProcessing}
              className="h-11"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Try Sample
            </Button>
          </div>

          {/* Info badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`text-xs font-normal border-0 ${
                rateLimit.remaining <= 0
                  ? 'bg-destructive/10 text-destructive'
                  : rateLimit.remaining <= 2
                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <Upload className="h-3 w-3 mr-1" />
              {rateLimit.remaining <= 0
                ? `Limit reached — resets in ${rateLimit.resetInMinutes}m`
                : `${rateLimit.remaining} of 5 requests remaining`}
            </Badge>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
