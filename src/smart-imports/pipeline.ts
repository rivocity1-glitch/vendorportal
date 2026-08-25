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
import { invoiceTemplates } from './invoiceTemplates';
import { supabase } from '../lib/supabase';
import { normalizeInvoiceRow } from './fieldNormalizer';

function isCsvFile(file: File): boolean {
  const csvMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
  return csvMimeTypes.includes(file.type.toLowerCase()) || file.name.toLowerCase().endsWith('.csv');
}

function normalizeCategoryLabel(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

function resolveCategoryId(product: ParsedProduct, categories: { id: string; name: string }[] | null | undefined, fallbackName: string): string | null {
  if (!categories?.length) return null;

  const supplied = normalizeCategoryLabel(product.category ?? product.sourceCategory);
  if (supplied) {
    const exact = categories.find(c => normalizeCategoryLabel(c.name) === supplied);
    if (exact) return exact.id;

    const aliases: Record<string, string[]> = {
      pharmacy: ['medical'],
      'pet store': ['pet supplies'],
      'general store': ['home and kitchen', 'grocery'],
      'beauty cosmetics': ['personal care'],
      hardware: ['hardware'],
      stationery: ['stationery'],
      electronics: ['electronics'],
      fashion: ['fashion'],
      grocery: ['grocery']
    };

    const candidates = aliases[supplied] ?? [];
    for (const candidate of candidates) {
      const match = categories.find(c => normalizeCategoryLabel(c.name) === normalizeCategoryLabel(candidate));
      if (match) return match.id;
    }
  }

  const fallback = categories.find(c => normalizeCategoryLabel(c.name) === normalizeCategoryLabel(fallbackName));
  return fallback?.id ?? null;
}

export async function runImportPipeline(file: File, existingProducts: ExistingProduct[] = []): Promise<PipelineResult> {
  if (!file) throw new Error('Pipeline execution aborted: No file payload provided.');

  let parsedProducts: ParsedProduct[] = [];

  if (isCsvFile(file)) {
    console.log('CSV detected: Routing directly to CSV Importer without OCR or PDF processing...');
    parsedProducts = await parseCsvFile(file);
    console.log('CSV parsing completed. Total parsed items:', parsedProducts.length);
  } else {
    let fullText = '';
    let requiresOcr = false;

    if (file.type === 'application/pdf') {
      try {
        fullText = await extractPdfText(file);
        requiresOcr = !(fullText.length >= 50 && isInvoiceLikely(fullText));
      } catch (error) {
        console.warn('Failed to extract native PDF text, falling back to OCR:', error);
        requiresOcr = true;
      }
    } else if (file.type.startsWith('image/')) {
      requiresOcr = true;
    } else {
      throw new Error(`Unsupported file layout format: ${file.type}`);
    }

    if (requiresOcr) {
      fullText = '';
      const processedImageUrls = await prepareForOCR(file);
      if (processedImageUrls.length === 0) throw new Error('Pipeline execution aborted: File preparation stage failed to return valid image paths.');
      for (const imageUrl of processedImageUrls) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const inputForOcr = new File([blob], typeof imageUrl === 'string' ? (imageUrl.split('/').pop() || 'page.png') : 'page.png', { type: blob.type });
          fullText += await extractText(inputForOcr) + '\n';
        } catch (error) {
          console.error(error);
        }
      }
    }

    const reconstructedRows: StructuredRow[] = reconstructInvoiceTable(fullText);
    if (reconstructedRows.length > 0) {
      const normalizedRows = ['productName | hsn | quantity | unit | purchasePrice | mrp'];
      for (const rowObj of reconstructedRows) {
        const normObj = normalizeInvoiceRow(rowObj);
        normalizedRows.push(`${normObj.productName || ''} | ${normObj.hsn || ''} | ${normObj.quantity || ''} | ${normObj.unit || ''} | ${normObj.purchasePrice || ''} | ${normObj.mrp || ''}`);
      }
      parsedProducts = parseInvoiceLines(normalizedRows);
    } else {
      let selectedTemplate = invoiceTemplates.find(t => t.detect(fullText));
      if (!selectedTemplate) selectedTemplate = invoiceTemplates[invoiceTemplates.length - 1];
      if (!selectedTemplate) throw new Error('Unsupported invoice format.');
      const cleanLines = selectedTemplate.parse(fullText);
      if (cleanLines.length === 0) return { items: [], summary: { total: 0, newProducts: 0, existingProducts: 0, needsReview: 0 } };
      parsedProducts = parseInvoiceLines(cleanLines);
    }
  }

  if (parsedProducts.length === 0) return { items: [], summary: { total: 0, newProducts: 0, existingProducts: 0, needsReview: 0 } };

  const { data: categories } = await supabase.from('product_categories').select('id,name');
  const reviewItems: ReviewItem[] = [];
  let newProductsCount = 0;
  let existingProductsCount = 0;
  let needsReviewCount = 0;

  for (let i = 0; i < parsedProducts.length; i++) {
    const product = parsedProducts[i];
    const categoryMatch = matchCategory(product);
    const productMatch = matchProduct(product, existingProducts);

    // For CSVs, the explicit Vendor Category always wins over name-based guessing.
    const finalCategory = resolveCategoryId(product, categories, categoryMatch.categoryName);
    const finalStock = product.quantity ?? DEFAULT_IMPORT_VALUES.STOCK;
    const hasUsablePrice = [product.sellingPrice, product.mrp, product.costPrice].some(v => v !== null && v !== undefined && Number(v) > 0);

    let status: typeof IMPORT_STATUS[keyof typeof IMPORT_STATUS];
    if (!product.name || !hasUsablePrice) {
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
      packSize: product.packSize ?? product.variant ?? product.unit ?? null,
      costPrice: product.costPrice ?? null,
      mrp: product.mrp ?? null,
      manufacturer: product.manufacturer ?? null,
      barcode: product.barcode ?? null,
      sku: product.sku ?? null,
      purchaseRate: product.purchaseRate ?? product.costPrice ?? null,
      sellingPrice: product.sellingPrice ?? null,
      ptr: product.ptr ?? null,
      pts: product.pts ?? null,
      scheme: product.scheme ?? null,
      schemeDiscount: product.schemeDiscount ?? null,
      netRate: product.netRate ?? null,
      gst: product.gstRate ?? null,
      gstRate: product.gstRate ?? null,
      gstSlab: product.gstSlab ?? null,
      cgst: product.cgst ?? null,
      sgst: product.sgst ?? null,
      igst: product.igst ?? null,
      hsn: product.hsnCode ?? null,
      hsnCode: product.hsnCode ?? null,
      batch: product.batch ?? null,
      expiry: product.expiry ?? null,
      manufacturingDate: product.manufacturingDate ?? null,
      lowStockThreshold: product.lowStockThreshold ?? null,
      notes: product.notes ?? null,
      prescriptionRequired: product.prescriptionRequired ?? null,
      invoiceRaw: product.rawText ?? null,
      status,
      productMatch: productMatch.matchType !== 'None' ? productMatch : null,
      categoryMatch: categoryMatch.confidence > 0 ? categoryMatch : null
    };

    reviewItems.push(reviewItem);
  }

  const summary: ImportSummary = {
    total: reviewItems.length,
    newProducts: newProductsCount,
    existingProducts: existingProductsCount,
    needsReview: needsReviewCount
  };

  return { items: reviewItems, summary };
}