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

function isCsvFile(file: File): boolean {
  const csvMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
  return csvMimeTypes.includes(file.type.toLowerCase()) || file.name.toLowerCase().endsWith('.csv');
}

function normalizeCategoryLabel(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Prefer the category explicitly supplied by a CSV, then use known aliases, then product-name matching. */
function resolveCategoryId(product: ParsedProduct, categories: { id: string; name: string }[] | null | undefined, fallbackName: string): string | null {
  if (!categories?.length) return null;

  const supplied = normalizeCategoryLabel(product.category);
  if (supplied) {
    const exact = categories.find(c => normalizeCategoryLabel(c.name) === supplied);
    if (exact) return exact.id;

    const aliases: Record<string, string[]> = {
      pharmacy: ['medical', 'pharmacy'],
      'pet store': ['pet supplies', 'pet store'],
      'general store': ['grocery', 'general store'],
      'beauty cosmetics': ['beauty cosmetics', 'beauty', 'cosmetics', 'personal care'],
      'fruits vegetables': ['fruits vegetables', 'fruits and vegetables']
    };

    const candidates = aliases[String(product.category ?? '').trim().toLowerCase()] ?? [];
    for (const candidate of candidates) {
      const match = categories.find(c => normalizeCategoryLabel(c.name) === normalizeCategoryLabel(candidate));
      if (match) return match.id;
    }

    // Last-resort partial match for catalog category labels such as "Beauty & Personal Care".
    const partial = categories.find(c => {
      const db = normalizeCategoryLabel(c.name);
      return db.includes(supplied) || supplied.includes(db);
    });
    if (partial) return partial.id;
  }

  const fallback = categories.find(c => normalizeCategoryLabel(c.name) === normalizeCategoryLabel(fallbackName));
  return fallback?.id ?? null;
}

export async function runImportPipeline(
  file: File,
  existingProducts: ExistingProduct[] = []
): Promise<PipelineResult> {
  if (!file) throw new Error('Pipeline execution aborted: No file payload provided.');

  let parsedProducts: ParsedProduct[] = [];

  if (isCsvFile(file)) {
    console.log("CSV detected: Routing directly to CSV Importer without OCR or PDF processing...");
    parsedProducts = await parseCsvFile(file);
    console.log("CSV parsing completed. Total parsed items:", parsedProducts.length);
  } else {
    let fullText = '';
    let requiresOcr = false;

    if (file.type === 'application/pdf') {
      try {
        fullText = await extractPdfText(file);
        const isMeaningfulText = fullText.length >= 50 && isInvoiceLikely(fullText);
        requiresOcr = !isMeaningfulText;
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
      fullText = '';
      const processedImageUrls = await prepareForOCR(file);
      if (processedImageUrls.length === 0) throw new Error('Pipeline execution aborted: File preparation stage failed to return valid image paths.');

      for (const imageUrl of processedImageUrls) {
        let inputForOcr: File | string = imageUrl;
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          inputForOcr = new File([blob], typeof imageUrl === 'string' ? (imageUrl.split('/').pop() || 'page.png') : 'page.png', { type: blob.type });
          fullText += await extractText(inputForOcr as File) + '\n';
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
      if (!selectedTemplate) throw new Error("Unsupported invoice format.");
      const cleanLines = selectedTemplate.parse(fullText);
      if (cleanLines.length === 0) return { items: [], summary: { total: 0, newProducts: 0, existingProducts: 0, needsReview: 0 } };
      parsedProducts = parseInvoiceLines(cleanLines);
    }
  }

  if (parsedProducts.length === 0) return { items: [], summary: { total: 0, newProducts: 0, existingProducts: 0, needsReview: 0 } };

  const { data: categories } = await supabase.from("product_categories").select("id,name");

  const reviewItems: ReviewItem[] = [];
  let newProductsCount = 0;
  let existingProductsCount = 0;
  let needsReviewCount = 0;

  for (let i = 0; i < parsedProducts.length; i++) {
    const product = parsedProducts[i] as ParsedProduct;

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

    // CSV category wins over product-name guessing. This prevents e.g. Coca-Cola from being classified as Medical.
    const finalCategory = resolveCategoryId(product, categories, categoryMatch.categoryName);
    const finalStock = product.quantity ?? DEFAULT_IMPORT_VALUES.STOCK;

    let status: typeof IMPORT_STATUS[keyof typeof IMPORT_STATUS] = IMPORT_STATUS.NEW;

    // A CSV containing a valid selling price is importable even when supplier cost/MRP are absent.
    const hasUsablePrice = [product.sellingPrice, product.mrp, product.costPrice].some(v => v !== null && v !== undefined && Number(v) > 0);

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
      unit: product.unit ?? product.variant ?? null,
      costPrice: product.costPrice ?? null,
      mrp: product.mrp ?? null,
      packing: product.variant ?? product.unit ?? null,
      manufacturer: product.manufacturer ?? null,
      barcode: product.barcode ?? null,
      sku: product.sku ?? null,
      purchaseRate: product.purchaseRate ?? product.costPrice ?? null,
      sellingRate: product.sellingPrice ?? null,
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
      batch: product.batch ?? null,
      expiry: product.expiry ?? null,
      manufacturingDate: product.manufacturingDate ?? null,
      invoiceRaw: product.rawText ?? null,
      status,
      productMatch: productMatch.matchType !== 'None' ? productMatch : null,
      categoryMatch: categoryMatch.confidence > 0 ? categoryMatch : null
    } as ReviewItem;

    reviewItems.push(reviewItem);
  }

  return {
    items: reviewItems,
    summary: {
      total: reviewItems.length,
      newProducts: newProductsCount,
      existingProducts: existingProductsCount,
      needsReview: needsReviewCount
    }
  };
}