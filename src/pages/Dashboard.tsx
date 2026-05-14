import React, { useState, useRef, useCallback } from 'react';
import PageMeta from '@/components/common/PageMeta';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
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
import { virtualDb } from '@/lib/db-fallback';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

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
    let documentText = textInput.trim();
    let filePath: string | null = null;
    let inputType: 'pdf' | 'image' | 'text' = 'text';
    let title = 'Text Input';

    if (uploadedFile) {
      inputType = getFileType(uploadedFile);
      title = uploadedFile.name;

      // Upload file to storage
      const path = `${user!.id}/${crypto.randomUUID()}_${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, uploadedFile, { contentType: uploadedFile.type });

      if (uploadError) {
        setError('Failed to upload file. Please try again.');
        return;
      }
      filePath = path;

      // For PDFs and images, we need to extract text
      // For demo purposes, we'll use the file name as a placeholder for text
      // In production, you'd use an OCR service or PDF text extraction
      documentText = `[Document: ${uploadedFile.name}]\n\n${textInput || 'Please analyze this uploaded document.'}`;
    } else if (!documentText) {
      setError('Please upload a file or paste some text to process.');
      return;
    }

    setIsProcessing(true);

    // Create document record
    let docData;
    let docError;

    const docPayload = {
      user_id: user!.id,
      title,
      input_type: inputType,
      original_text: documentText,
      file_path: filePath,
      status: 'processing' as const,
    };

    const { data: realDocData, error: realDocError } = await supabase
      .from('documents')
      .insert(docPayload)
      .select('id')
      .single();

    if (realDocError) {
      console.warn('Real database failed, using virtual database for developer:', realDocError);
      if (user?.email === 'eklavya2227@gmail.com') {
        docData = await virtualDb.createDocument(docPayload);
      } else {
        docError = realDocError;
      }
    } else {
      docData = realDocData;
    }

    if (docError || !docData) {
      setError('Failed to create document record. Please try again.');
      setIsProcessing(false);
      return;
    }

    const documentId = docData.id;

    // Navigate to processing page with document ID
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
            <Badge variant="secondary" className="text-xs font-normal bg-muted text-muted-foreground border-0">
              <Upload className="h-3 w-3 mr-1" />
              5 requests per hour
            </Badge>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
