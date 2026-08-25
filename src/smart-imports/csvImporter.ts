import Papa from 'papaparse';
import { ParsedProduct } from './types';
import * as fieldNormalizer from './fieldNormalizer';

function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const yearMonthMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (yearMonthMatch) { const [, y, m] = yearMonthMatch; const monthNum = parseInt(m, 10); if (monthNum >= 1 && monthNum <= 12) return `${y}-${String(monthNum).padStart(2, '0')}-01`; }
  const monthYearMatch = trimmed.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (monthYearMatch) { const [, m, y] = monthYearMatch; const monthNum = parseInt(m, 10); if (monthNum >= 1 && monthNum <= 12) return `${y}-${String(monthNum).padStart(2, '0')}-01`; }
  const fullDateMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (fullDateMatch) { const [, d, m, y] = fullDateMatch; const dayNum = parseInt(d, 10); const monthNum = parseInt(m, 10); if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) return `${y}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`; }
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) { const dateObj = new Date(parsed); const y = dateObj.getFullYear(); if (y > 1970 && y < 2100) return `${y}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`; }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = parseFloat(String(value).replace(/,/g, '').replace(/%/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return null;
}

export async function parseCsvFile(file: File): Promise<ParsedProduct[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const text = event.target?.result as string;
        if (!text) return resolve([]);
        const preliminaryParse = Papa.parse(text, { header: false, skipEmptyLines: 'greedy' });
        const rawRows = preliminaryParse.data as string[][];
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const normalizedTest = fieldNormalizer.normalizeHeaders(rawRows[i] || []);
          const matchedCount = normalizedTest.filter((h: string) => ['productName', 'hsn', 'quantity', 'unit', 'purchasePrice', 'sellingPrice', 'mrp', 'barcode', 'batch', 'expiry', 'gst', 'sku', 'manufacturer', 'category', 'productCategory', 'subcategory', 'variant'].includes(h)).length;
          if (matchedCount >= 2) { headerRowIndex = i; break; }
        }
        const adjustedCsvText = Papa.unparse(rawRows.slice(headerRowIndex));
        Papa.parse(adjustedCsvText, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header: string) => fieldNormalizer.normalizeHeaders([header])[0] || header.trim(),
          complete: (results: Papa.ParseResult<Record<string, any>>) => {
            try {
              const rows = results.data as Record<string, any>[];
              const parsedProducts: ParsedProduct[] = [];
              for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                if (!Object.values(row).some(v => v !== null && v !== undefined && String(v).trim().length > 0)) continue;
                const normalized = fieldNormalizer.normalizeInvoiceRow(row);
                const name = normalized.productName || null;
                const quantityVal = parseNumber(normalized.quantity);
                const costVal = parseNumber(normalized.purchasePrice);
                const sellingPriceVal = parseNumber(normalized.sellingPrice);
                const mrpVal = parseNumber(normalized.mrp);
                const gstVal = parseNumber(normalized.gst);
                const lowStockThreshold = parseNumber(normalized.lowStockThreshold);
                const hasName = Boolean(name && String(name).trim().length > 0);
                const hasNumericField = [quantityVal, costVal, sellingPriceVal, mrpVal].some(v => v !== null);
                if (!hasName || !hasNumericField) continue;
                const sourceCategory = normalized.category ? String(normalized.category).trim() : null;
                const productCategory = normalized.productCategory ? String(normalized.productCategory).trim() : null;
                const subcategory = normalized.subcategory ? String(normalized.subcategory).trim() : null;
                const variant = normalized.variant ? String(normalized.variant).trim() : null;
                parsedProducts.push({
                  name: String(name).trim(), quantity: quantityVal, costPrice: costVal, sellingPrice: sellingPriceVal, mrp: mrpVal,
                  expiry: normalizeDate(normalized.expiry || null), batch: normalized.batch || null, manufacturer: normalized.manufacturer || null,
                  rawText: Object.values(row).filter(Boolean).join(' | '), category: sourceCategory, sourceCategory, productCategory,
                  subcategory, variant, packSize: variant || normalized.unit || null, barcode: normalized.barcode || null, sku: normalized.sku || null,
                  gstRate: gstVal, gstSlab: gstVal !== null ? `${gstVal}%` : null, gstPercent: gstVal, hsnCode: normalized.hsn || null,
                  weight: normalized.weight || null, unit: normalized.unit || null, confidence: 100,
                  manufacturingDate: normalizeDate(normalized.mfgDate || normalized.manufacturingDate || null),
                  mfgDate: normalizeDate(normalized.mfgDate || normalized.manufacturingDate || null), lowStockThreshold,
                  notes: normalized.notes ? String(normalized.notes).trim() : null,
                  prescriptionRequired: parseBoolean(normalized.prescriptionRequired)
                });
              }
              resolve(parsedProducts);
            } catch (err) { reject(err); }
          },
          error: (error: Error) => reject(error)
        });
      } catch (err) { reject(err); }
    };
    reader.onerror = (error: ProgressEvent<FileReader>) => reject(error);
    reader.readAsText(file);
  });
}