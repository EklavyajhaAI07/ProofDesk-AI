import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }

  if (!fullText.trim()) {
    throw new Error('No text found in PDF. The PDF may contain only images. Try using an image file for OCR.');
  }

  return fullText;
}

async function extractTextFromImage(file: File): Promise<string> {
  try {
    const Tesseract = await import('tesseract.js');
    
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => console.log('OCR:', m.status, m.progress),
    });

    const text = result.data.text;

    if (!text.trim()) {
      throw new Error('No text detected in image');
    }

    return text;
  } catch (err: any) {
    if (err.message === 'No text detected in image') {
      throw err;
    }
    throw new Error(`OCR failed: ${err.message}. Please try with a clearer image.`);
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}
