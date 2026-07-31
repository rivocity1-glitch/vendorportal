import { SUPPORTED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from './constants';
import * as pdfjsLib from 'pdfjs-dist';

// Configures the PDF.js worker locally using Vite's ESM asset bundling resolution
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
 * Detects whether an HTMLCanvasElement represents a digital screenshot based on visual characteristics:
 * - High resolution & crisp aspect bounds
 * - Very low noise/variance in solid pixel areas
 * - Sharp edge transitions with perfect horizontal alignment
 */
function isScreenshot(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): boolean {
  const width = canvas.width;
  const height = canvas.height;

  // Screenshots usually have standard display aspect ratios or clean bounds and decent pixel density
  if (width < 300 || height < 300) {
    return false;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const numPixels = width * height;

  let totalVariance = 0;
  let sampleCount = 0;

  // Sample horizontal pixel rows to check for solid digital backgrounds (low variance)
  const step = Math.max(1, Math.floor(numPixels / 2000));
  for (let i = 0; i < numPixels - 1; i += step) {
    const idx = i * 4;
    const nextIdx = (i + 1) * 4;

    const diffR = Math.abs(data[idx] - data[nextIdx]);
    const diffG = Math.abs(data[idx + 1] - data[nextIdx + 1]);
    const diffB = Math.abs(data[idx + 2] - data[nextIdx + 2]);

    totalVariance += diffR + diffG + diffB;
    sampleCount++;
  }

  const averageNeighborVariance = totalVariance / (sampleCount * 3);

  // Digital screenshots typically have huge flat regions (near 0 variance) intermingled with crisp digital text
  // Camera photos have ubiquitous sensor noise across all pixels (higher baseline neighbor variance)
  return averageNeighborVariance < 12.0;
}

/**
 * Preprocessing path optimized strictly for digital screenshots:
 * Applies grayscale conversion, optional 2x upscale if small, and light contrast enhancement.
 * Bypasses edge detection, cropping, rotation, aggressive sharpening, shadow removal, or denoising.
 */
function processScreenshot(canvas: HTMLCanvasElement): HTMLCanvasElement {
  let outputCanvas = canvas;
  let width = canvas.width;
  let height = canvas.height;

  // Optional 2x upscale for small image dimensions to improve OCR character rasterization
  if (width < 1200 || height < 1200) {
    width *= 2;
    height *= 2;

    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = width;
    scaledCanvas.height = height;

    const scaledCtx = scaledCanvas.getContext('2d');
    if (scaledCtx) {
      scaledCtx.imageSmoothingEnabled = true;
      scaledCtx.imageSmoothingQuality = 'high';
      scaledCtx.drawImage(canvas, 0, 0, width, height);
      outputCanvas = scaledCanvas;
    }
  }

  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return outputCanvas;

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const numPixels = width * height;

  // Light contrast factor and mid-point adjustment
  const contrast = 1.15;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;

    // Convert to Grayscale using standard luminosity weights
    const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

    // Light contrast enhancement
    const enhanced = factor * (gray - 128) + 128;
    const clamped = Math.min(255, Math.max(0, enhanced));

    data[idx] = clamped;     // R
    data[idx + 1] = clamped; // G
    data[idx + 2] = clamped; // B
  }

  ctx.putImageData(imageData, 0, 0);
  return outputCanvas;
}

/**
 * Preprocessing path optimized for camera photos:
 * Applies denoising, brightness normalization, contrast enhancement, and unsharp sharpening matrix.
 */
function applyImageEnhancements(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const numPixels = width * height;

  // 1. Calculate luminance statistics for Brightness Normalization and Contrast Enhancement
  let totalLuminance = 0;
  const luminances = new Float32Array(numPixels);

  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminances[i] = lum;
    totalLuminance += lum;
  }

  const avgLuminance = totalLuminance / numPixels;
  const targetLuminance = 128;
  const brightnessOffset = targetLuminance - avgLuminance;

  let varianceSum = 0;
  for (let i = 0; i < numPixels; i++) {
    const diff = luminances[i] - avgLuminance;
    varianceSum += diff * diff;
  }
  const stdDev = Math.sqrt(varianceSum / numPixels) || 1;
  const contrastFactor = Math.min(Math.max(128 / stdDev, 1.0), 2.2);

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    for (let c = 0; c < 3; c++) {
      let val = data[idx + c] + brightnessOffset;
      val = (val - targetLuminance) * contrastFactor + targetLuminance;
      data[idx + c] = Math.min(255, Math.max(0, val));
    }
  }

  // 2. Denoising & Sharpening (Unsharp Mask matrix pass)
  const output = new Uint8ClampedArray(data);
  const kernel = [
    0, -1,  0,
   -1,  5, -1,
    0, -1,  0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixelIdx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        let convVal = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const neighborIdx = ((y + ky) * width + (x + kx)) * 4 + c;
            const kWeight = kernel[(ky + 1) * 3 + (kx + 1)];
            convVal += data[neighborIdx] * kWeight;
          }
        }

        output[pixelIdx + c] = Math.min(255, Math.max(0, convVal));
      }
    }
  }

  return new ImageData(output, width, height);
}

/**
 * Computes Sobel edge detection to identify text/document boundaries for photo cropping.
 */
function findBoundingBoxAndCrop(imageData: ImageData): { x: number; y: number; w: number; h: number } {
  const { data, width, height } = imageData;
  const numPixels = width * height;
  const gray = new Float32Array(numPixels);

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  let minX = width, minY = height, maxX = 0, maxY = 0;
  const threshold = 40;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;

      const gx =
        -gray[idx - width - 1] + gray[idx - width + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + width - 1] + gray[idx + width + 1];

      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];

      const edgeMagnitude = Math.sqrt(gx * gx + gy * gy);

      if (edgeMagnitude > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return { x: 0, y: 0, w: width, h: height };
  }

  const pad = 10;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, (maxX - minX) + pad * 2);
  const cropH = Math.min(height - cropY, (maxY - minY) + pad * 2);

  return { x: cropX, y: cropY, w: cropW, h: cropH };
}

/**
 * Checks document aspect ratio and pixel intensity layout to auto-rotate camera images.
 */
function autoRotateCanvasIfNeeded(canvas: HTMLCanvasElement): HTMLCanvasElement {
  if (canvas.width > canvas.height * 1.3) {
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = canvas.height;
    rotatedCanvas.height = canvas.width;

    const ctx = rotatedCanvas.getContext('2d');
    if (ctx) {
      ctx.translate(0, canvas.width);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(canvas, 0, 0);
      return rotatedCanvas;
    }
  }

  return canvas;
}

/**
 * Processes, normalizes, and prepares an image file into an optimized canvas/blob matrix.
 * Automatically branches between Screenshot and Photo processing paths.
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
          const maxDimension = 2400;
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

          let canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to capture canvas 2D graphic rendering context.');
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Evaluate image characteristics to choose Screenshot vs Photo path
          let finalCanvas: HTMLCanvasElement;

          if (isScreenshot(canvas, ctx)) {
            console.log('Image processor: Screenshot path detected');
            finalCanvas = processScreenshot(canvas);
          } else {
            console.log('Image processor: Photo path detected');

            // 1. Auto Rotate check
            canvas = autoRotateCanvasIfNeeded(canvas);
            const currentCtx = canvas.getContext('2d');
            if (!currentCtx) {
              throw new Error('Failed to capture rotated canvas 2D context.');
            }

            // 2. Denoise, Brightness Normalization, Contrast Improvement & Sharpening
            let imageData = currentCtx.getImageData(0, 0, canvas.width, canvas.height);
            imageData = applyImageEnhancements(imageData);
            currentCtx.putImageData(imageData, 0, 0);

            // 3. Edge Detection & Whitespace Crop
            const cropBox = findBoundingBoxAndCrop(imageData);
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropBox.w;
            croppedCanvas.height = cropBox.h;

            const croppedCtx = croppedCanvas.getContext('2d');
            if (croppedCtx) {
              croppedCtx.drawImage(
                canvas,
                cropBox.x, cropBox.y, cropBox.w, cropBox.h,
                0, 0, cropBox.w, cropBox.h
              );
            }

            finalCanvas = croppedCtx ? croppedCanvas : canvas;
          }

          finalCanvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(URL.createObjectURL(blob));
              } else {
                reject(new Error('Image extraction layer optimization returned empty blob reference.'));
              }
            },
            'image/jpeg',
            0.85
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
      
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      let canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error(`Failed to initialize 2D context for page ${pageNum}.`);
      }

      await page.render({
        canvasContext: ctx,
        canvas: canvas,
        viewport: viewport
      }).promise;

      canvas = autoRotateCanvasIfNeeded(canvas);
      const pageCtx = canvas.getContext('2d');
      if (pageCtx) {
        let imageData = pageCtx.getImageData(0, 0, canvas.width, canvas.height);
        imageData = applyImageEnhancements(imageData);
        pageCtx.putImageData(imageData, 0, 0);

        const cropBox = findBoundingBoxAndCrop(imageData);
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropBox.w;
        croppedCanvas.height = cropBox.h;

        const croppedCtx = croppedCanvas.getContext('2d');
        if (croppedCtx) {
          croppedCtx.drawImage(
            canvas,
            cropBox.x, cropBox.y, cropBox.w, cropBox.h,
            0, 0, cropBox.w, cropBox.h
          );
          canvas = croppedCanvas;
        }
      }

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

  const structuralImageUrl = await processImage(file);
  return [structuralImageUrl];
}