import { prepareForOCR } from './imageProcessor';
import { extractText } from './ocr';
import { extractPdfText } from './pdfTextExtractor';
import { reconstructInvoiceTable } from './tableReconstructor';
import { parseInvoiceLines } from './parser';
import { matchCategory } from './categoryMatcher';
import { matchProduct, ExistingProduct } from './productMatcher';
import { PipelineResult, ReviewItem, ImportSummary } from './types';
import { IMPORT_STATUS, DEFAULT_IMPORT_VALUES } from './constants';
import { invoiceTemplates } from "./invoiceTemplates";
import { supabase } from "../lib/supabase";

/**
 * Orchestrates the complete end-to-end multi-layered Smart Import processing pipeline.
 * Ingests a raw file, processes its layout (using native text extraction for PDFs or 
 * OCR for image formats), reconstructs columnar text tables into structured rows,
 * validates the layout via template detection, parses, matches entity vectors,
 * and generates a deterministic reviewable item summary payload.
 * * @param file The uploaded invoice image or PDF file object.
 * @param existingProducts Optional array of master reference inventory products for sync matching.
 * @returns A promise resolving to the final structured PipelineResult mapping details.
 */
export async function runImportPipeline(
  file: File,
  existingProducts: ExistingProduct[] = []
): Promise<PipelineResult> {
  if (!file) {
    throw new Error('Pipeline execution aborted: No file payload provided.');
  }

  let fullText = '';

  // Branch flow dynamically based on document MIME type structure
  if (file.type === 'application/pdf') {
    console.log("Using PDF text extraction");
    console.log('extractPdfText() started');
    try {
      // Extract layout-preserved text matrix rows directly from the PDF file block
      fullText = await extractPdfText(file);
      console.log('extractPdfText() completed', 'Length of extracted text:', fullText.length);
    } catch (error) {
      console.error(error);
      throw error;
    }
  } else if (file.type.startsWith('image/')) {
    console.log("Using OCR");
    // 1 & 2. Prepare image matrix components for the OCR layer
    console.log('prepareForOCR() started');
    let processedImageUrls: string[] = [];
    try {
      processedImageUrls = await prepareForOCR(file);
      console.log('prepareForOCR() completed', 'Number of generated images:', processedImageUrls.length);
    } catch (error) {
      console.error(error);
      throw error;
    }

    if (processedImageUrls.length === 0) {
      throw new Error('Pipeline execution aborted: File preparation stage failed to return valid image paths.');
    }

    // 3. Run OCR over the prepared pages sequentially
    console.log('OCR started');
    for (const imageUrl of processedImageUrls) {
      let inputForOcr: File | string = imageUrl;

      if (typeof imageUrl === 'string') {
        try {
          if (imageUrl.startsWith('data:')) {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            inputForOcr = new File([blob], 'page.png', { type: blob.type });
          } else {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            const name = imageUrl.split('/').pop() || 'page.png';
            inputForOcr = new File([blob], name, { type: blob.type });
          }
        } catch (e) {
          console.error(e);
          console.warn('Failed to fetch image for OCR:', e);
          continue;
        }
      }

      try {
        const pageText = await extractText(inputForOcr as File);
        fullText += pageText + '\n';
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
    console.log('OCR completed', 'Length of extracted text:', fullText.length);
  } else {
    throw new Error(`Unsupported file layout format: ${file.type}`);
  }

  // Intercept layout and reconstruct tabular tokens column-to-row wise
  console.log("Original Lines:", fullText.split("\n").length);
  const reconstructedRows = reconstructInvoiceTable(fullText);
  console.log("Reconstructed Rows:", reconstructedRows.length);
  console.log(reconstructedRows);

  const reconstructedText = reconstructedRows.join("\n");

  // Template Detection and Layout Resolution Layer
  let selectedTemplate = invoiceTemplates.find(t => t.detect(reconstructedText));
  if (!selectedTemplate) {
    throw new Error("Unsupported invoice format.");
  }
  console.log("Detected Template:", selectedTemplate?.name);

  // 4. Resolve clean matching items using the matched template engine parsing strategy
  console.log('Invoice line extraction started via template configuration');
  let cleanLines: string[] = [];
  try {
    cleanLines = selectedTemplate.parse(reconstructedText);
    console.log('Invoice line extraction completed', 'Number of lines matched:', cleanLines.length);
  } catch (error) {
    console.error(error);
    throw error;
  }

  if (cleanLines.length === 0) {
    return {
      items: [],
      summary: { total: 0, newProducts: 0, existingProducts: 0, needsReview: 0 }
    };
  }

  // 5. Parse clean rows into individual distinct products
  console.log('Parser started');
  let parsedProducts = [];
  try {
    parsedProducts = parseInvoiceLines(cleanLines);
    console.log('Parser completed', 'Number of parsed products:', parsedProducts.length);
  } catch (error) {
    console.error(error);
    throw error;
  }

  // Load master product category references from database to map names to strict UUID keys
  const { data: categories } = await supabase
    .from("product_categories")
    .select("id,name");

  const reviewItems: ReviewItem[] = [];
  let newProductsCount = 0;
  let existingProductsCount = 0;
  let needsReviewCount = 0;

  // 6, 7 & 8. Run matching metrics, status evaluation, and object generation loops
  for (let i = 0; i < parsedProducts.length; i++) {
    const product = parsedProducts[i];
    
    // Evaluate matching layers
    console.log('Category matcher started');
    let categoryMatch;
    try {
      categoryMatch = matchCategory(product);
      console.log('Category matcher completed');
    } catch (error) {
      console.error(error);
      throw error;
    }

    console.log('Product matcher started');
    let productMatch;
    try {
      productMatch = matchProduct(product, existingProducts);
      console.log('Product matcher completed');
    } catch (error) {
      console.error(error);
      throw error;
    }

    // Resolve name strings against fetched tracking master indexes to extract matching UUID keys
    const matchedCategory = categoryMatch.categoryName
      ? categories?.find(c => c.name.toLowerCase() === categoryMatch.categoryName.toLowerCase())
      : null;

    const finalCategory = matchedCategory?.id ?? null;

    console.log("Matched category:", categoryMatch.categoryName);
    console.log("Resolved UUID:", finalCategory);

    const finalStock = product.quantity ?? DEFAULT_IMPORT_VALUES.STOCK;

    // Evaluate operational checklist to assign standard statuses
    let status: typeof IMPORT_STATUS[keyof typeof IMPORT_STATUS] = IMPORT_STATUS.NEW;

    if (!product.name || product.costPrice === null || product.mrp === null) {
      status = IMPORT_STATUS.NEEDS_REVIEW;
      needsReviewCount++;
    } else if (productMatch.matchType === 'Exact' || productMatch.matchType === 'Fuzzy') {
      status = IMPORT_STATUS.MATCH_FOUND;
      existingProductsCount++;
    } else {
      status = IMPORT_STATUS.NEW;
      newProductsCount++;
    }

    const reviewItem: ReviewItem = {
      ...product,
      id: `rev-${i}-${Date.now()}`,
      selected: true,
      category: finalCategory, // Safely records either the matched reference UUID string or null setup mappings
      stock: finalStock,
      status,
      productMatch: productMatch.matchType !== 'None' ? productMatch : null,
      categoryMatch: categoryMatch.confidence > 0 ? categoryMatch : null,
      gst: null
    };

    reviewItems.push(reviewItem);
  }

  const summary: ImportSummary = {
    total: reviewItems.length,
    newProducts: newProductsCount,
    existingProducts: existingProductsCount,
    needsReview: needsReviewCount
  };

  console.log('Pipeline completed successfully');

  return {
    items: reviewItems,
    summary
  };
}