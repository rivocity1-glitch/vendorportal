import { prepareForOCR } from './imageProcessor';
import { extractText, isInvoiceLikely } from './ocr';
import { extractPdfText } from './pdfTextExtractor';
import { reconstructInvoiceTable, StructuredRow } from './tableReconstructor';
import { parseInvoiceLines } from './parser';
import { parseCsvFile } from './csvImporter';
import { matchCategory } from './categoryMatcher';
import { matchProduct, ExistingProduct } from './productMatcher';
import { PipelineResult, ReviewItem, ImportSummary, ParsedProduct } from './types';
import { IMPORT_STATUS, DEFAULT_IMPORT_VALUES } from './constants';
import { invoiceTemplates } from "./invoiceTemplates";
import { supabase } from "../lib/supabase";
import { normalizeInvoiceRow } from './fieldNormalizer';

/**
 * Checks if the uploaded file is a CSV based on MIME type or file extension.
 */
function isCsvFile(file: File): boolean {
  const csvMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
  const isMimeMatch = csvMimeTypes.includes(file.type.toLowerCase());
  const isExtensionMatch = file.name.toLowerCase().endsWith('.csv');
  return isMimeMatch || isExtensionMatch;
}

/**
 * Orchestrates the complete end-to-end multi-layered Smart Import processing pipeline.
 * Routes CSVs directly to CSV parsing, digital PDFs to pdf.js text extraction, and images/scanned PDFs to OCR.
 *
 * @param file The uploaded invoice image, PDF, or CSV file object.
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

  let parsedProducts: ParsedProduct[] = [];

  // Branch 1: Native CSV Processing Flow
  if (isCsvFile(file)) {
    console.log("CSV detected: Routing directly to CSV Importer without OCR or PDF processing...");
    parsedProducts = await parseCsvFile(file);
    console.log("CSV parsing completed. Total parsed items:", parsedProducts.length);
  } else {
    // Branch 2: Standard PDF & Image Ingestion Pipelines
    let fullText = '';
    let requiresOcr = false;

    if (file.type === 'application/pdf') {
      console.log("PDF detected: Attempting pdf.js native text extraction...");
      try {
        fullText = await extractPdfText(file);
        console.log('PDF text extraction completed', 'Length of extracted text:', fullText.length);

        const MIN_TEXT_LENGTH_THRESHOLD = 50;
        const isMeaningfulText = fullText.length >= MIN_TEXT_LENGTH_THRESHOLD && isInvoiceLikely(fullText);

        if (isMeaningfulText) {
          console.log("Sufficient digital PDF text extracted. Skipping OCR.");
        } else {
          console.log("PDF extraction returned insufficient text. Treating as scanned PDF and falling back to OCR.");
          requiresOcr = true;
        }
      } catch (error) {
        console.warn("Failed to extract native PDF text, falling back to OCR:", error);
        requiresOcr = true;
      }
    } else if (file.type.startsWith('image/')) {
      requiresOcr = true;
    } else {
      throw new Error(`Unsupported file layout format: ${file.type}`);
    }

    if (requiresOcr) {
      console.log("Using OCR pipeline");
      fullText = '';

      let processedImageUrls: string[] = [];
      try {
        processedImageUrls = await prepareForOCR(file);
      } catch (error) {
        console.error(error);
        throw error;
      }

      if (processedImageUrls.length === 0) {
        throw new Error('Pipeline execution aborted: File preparation stage failed to return valid image paths.');
      }

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
    }

    // 1. Native PDF/OCR lines logging
    const nativePdfLines = fullText.split(/\r?\n/).filter(line => line.trim().length > 0);
    console.log('[Pipeline Debug] 1. Native PDF lines:', nativePdfLines);

    // 2. Structured rows returned by tableReconstructor
    const reconstructedRows: StructuredRow[] = reconstructInvoiceTable(fullText);
    console.log('[Pipeline Debug] 2. Structured rows returned by tableReconstructor:', reconstructedRows);

    if (reconstructedRows.length > 0) {
      const normalizedRows: string[] = [];
      normalizedRows.push('productName | hsn | quantity | unit | purchasePrice | mrp');

      for (const rowObj of reconstructedRows) {
        // 3. Objects passed into fieldNormalizer
        console.log('[Pipeline Debug] 3. Object passed into fieldNormalizer:', rowObj);
        const normObj = normalizeInvoiceRow(rowObj);
        const lineStr = `${normObj.productName || ''} | ${normObj.hsn || ''} | ${normObj.quantity || ''} | ${normObj.unit || ''} | ${normObj.purchasePrice || ''} | ${normObj.mrp || ''}`;
        normalizedRows.push(lineStr);
      }

      parsedProducts = parseInvoiceLines(normalizedRows);
    } else {
      let selectedTemplate = invoiceTemplates.find(t => t.detect(fullText));
      if (!selectedTemplate) {
        selectedTemplate = invoiceTemplates[invoiceTemplates.length - 1];
        if (!selectedTemplate) {
          throw new Error("Unsupported invoice format.");
        }
      }

      let cleanLines: string[] = [];
      try {
        cleanLines = selectedTemplate.parse(fullText);
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

      parsedProducts = parseInvoiceLines(cleanLines);
    }
  }

  if (parsedProducts.length === 0) {
    return {
      items: [],
      summary: { total: 0, newProducts: 0, existingProducts: 0, needsReview: 0 }
    };
  }

  const { data: categories } = await supabase
    .from("product_categories")
    .select("id,name");

  const reviewItems: ReviewItem[] = [];
  let newProductsCount = 0;
  let existingProductsCount = 0;
  let needsReviewCount = 0;

  for (let i = 0; i < parsedProducts.length; i++) {
    const product = parsedProducts[i] as any;
    
    let categoryMatch;
    try {
      categoryMatch = matchCategory(product);
    } catch (error) {
      console.error(error);
      throw error;
    }

    let productMatch;
    try {
      productMatch = matchProduct(product, existingProducts);
    } catch (error) {
      console.error(error);
      throw error;
    }

    const matchedCategory = categoryMatch.categoryName
      ? categories?.find(c => c.name.toLowerCase() === categoryMatch.categoryName.toLowerCase())
      : null;

    const finalCategory = matchedCategory?.id ?? null;
    const finalStock = product.quantity ?? DEFAULT_IMPORT_VALUES.STOCK;

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
      category: finalCategory,
      stock: finalStock,
      unit: product.unit ?? null,
      costPrice: product.costPrice !== null && product.costPrice !== undefined ? product.costPrice : null,
      mrp: product.mrp !== null && product.mrp !== undefined ? product.mrp : null,
      packing: product.packing ?? product.unit ?? null,
      manufacturer: product.manufacturer ?? null,
      barcode: product.barcode ?? null,
      sku: product.sku ?? null,
      purchaseRate: product.purchaseRate ?? null,
      sellingRate: product.sellingRate ?? null,
      ptr: product.ptr ?? null,
      pts: product.pts ?? null,
      scheme: product.scheme ?? null,
      schemeDiscount: product.schemeDiscount ?? null,
      netRate: product.netRate ?? null,
      gstRate: product.gstRate ?? null,
      gstSlab: product.gstSlab ?? null,
      cgst: product.cgst ?? null,
      sgst: product.sgst ?? null,
      igst: product.igst ?? null,
      hsnCode: product.hsnCode ?? null,
      batch: product.batch ?? product.batchNumber ?? null,
      expiry: product.expiry ?? product.expiryDate ?? null,
      manufacturingDate: product.manufacturingDate ?? null,
      invoiceRaw: product.invoiceRaw ?? null,
      status,
      productMatch: productMatch.matchType !== 'None' ? productMatch : null,
      categoryMatch: categoryMatch.confidence > 0 ? categoryMatch : null
    } as ReviewItem;

    reviewItems.push(reviewItem);
  }

  const summary: ImportSummary = {
    total: reviewItems.length,
    newProducts: newProductsCount,
    existingProducts: existingProductsCount,
    needsReview: needsReviewCount
  };

  return {
    items: reviewItems,
    summary
  };
}