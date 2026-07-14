import { SUPPORTED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from './constants';
import * as pdfjsLib from 'pdfjs-dist';

// Configures the PDF.js worker locally for a Vite environment using standard ESM asset resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Validates file upload criteria including size constraints and MIME type matches.
 * Throws errors if validation criteria fail.
 * @param file The raw file item submitted by user.
 */
export function validateUpload(file: File): void {
  if (!file) {
    throw new Error('No file provided for validation.');
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const sizeInMb = (MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(`File size exceeds the allowed limit of ${sizeInMb}MB.`);
  }

  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file format (${file.type || 'unknown'}). Please upload a valid image or PDF.`);
  }
}

/**
 * Processes, normalizes, resizes, and prepares an image file into an optimized canvas/blob matrix.
 * Enforces maximum boundary dimensions to ensure optimal downstream OCR text resolution layout.
 * @param file The raw image file object.
 * @returns A promise resolving to a localized Blob URL containing the sanitized image layout.
 */
export async function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDimension = 2400; // Optimal resolution threshold for OCR architectures
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to capture canvas 2D graphic rendering context.');
          }

          // Render canvas context and capture a structured optimized JPEG sequence stream
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(URL.createObjectURL(blob));
              } else {
                reject(new Error('Image extraction layer optimization returned empty blob reference.'));
              }
            },
            'image/jpeg',
            0.85 // Optimized standard quality/compression ratio
          );
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to resolve image layout boundaries or read structural image contents.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file storage buffer sequence stream.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts pages from a PDF document, rendering each onto an independent Canvas,
 * and exports them as optimized JPEG Blob URLs for downstream OCR ingestion.
 * @param file The PDF document file reference.
 * @returns An array containing localized resource blob URLs representing individual pages.
 */
export async function processPdf(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pageImageUrls: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Render at a high viewport scale to supply high-fidelity resolutions for the OCR engine
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error(`Failed to initialize 2D context for page ${pageNum}.`);
      }

      // Renders structural data to canvas context layer safely
      await page.render({
        canvasContext: ctx,
        canvas: canvas,
        viewport: viewport
      }).promise;

      const pageBlobUrl = await new Promise<string>((resolvePage, rejectPage) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolvePage(URL.createObjectURL(blob));
            } else {
              rejectPage(new Error(`Failed to generate Blob image from page ${pageNum}.`));
            }
          },
          'image/jpeg',
          0.90
        );
      });

      pageImageUrls.push(pageBlobUrl);
    }

    return pageImageUrls;
  } catch (error: any) {
    throw new Error(`Failed during layout sequence PDF serialization layer: ${error?.message || error}`);
  }
}

/**
 * Consolidated routing sequence interface executing data sanitation and asset matrix processing before engine delivery.
 * Automatically checks file metadata headers to resolve distribution pipelines.
 * @param file The source file upload element.
 * @returns Array containing localized string execution paths prepared for active character reading.
 */
export async function prepareForOCR(file: File): Promise<string[]> {
  validateUpload(file);

  if (file.type === 'application/pdf') {
    return await processPdf(file);
  }

  // Handle default baseline standard image sequence processes
  const structuralImageUrl = await processImage(file);
  return [structuralImageUrl];
}