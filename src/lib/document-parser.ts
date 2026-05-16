const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.mjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsModule: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfJs(): Promise<any> {
  if (!pdfjsModule) {
    pdfjsModule = await import(PDFJS_CDN);
    pdfjsModule.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  }
  return pdfjsModule;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;

  if (fileType === 'application/pdf') {
    return extractTextFromPDF(file);
  } else if (fileType.startsWith('image/')) {
    return extractTextFromImage(file);
  }

  throw new Error('Unsupported file type');
}

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str: string }) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }

  if (!fullText.trim()) {
    throw new Error('No text found in PDF. The PDF may be scanned or contain only images. Try using the text paste option instead.');
  }

  return fullText;
}

async function extractTextFromImage(file: File): Promise<string> {
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        
        const formData = new FormData();
        formData.append('base64Image', `data:${file.type};base64,${base64}`);
        formData.append('language', 'eng');
        
        const response = await fetch('https://api.ocr.space/parse', {
          method: 'POST',
          headers: {
            'apikey': 'helloworld',
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('OCR service unavailable');
        }

        const data = await response.json();
        
        if (data.IsErroredOnProcessing) {
          throw new Error(data.ErrorMessage?.[0] || 'OCR processing failed');
        }

        const text = data.ParsedResults?.[0]?.ParsedText || '';

        if (!text.trim()) {
          reject(new Error('No text detected in image. Try using the text paste option.'));
          return;
        }

        resolve(text);
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error.name === 'TypeError' || error.message?.includes('failed')) {
          reject(new Error('Image text extraction is currently unavailable. Please paste the text directly into the text field.'));
          return;
        }
        reject(new Error(`Image text extraction failed: ${error.message || 'Unknown error'}. Please try pasting the text directly.`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}
