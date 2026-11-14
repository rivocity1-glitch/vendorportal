import Papa from 'papaparse';
import { ParsedProduct } from './types';
import * as fieldNormalizer from './fieldNormalizer';

function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const input = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const dmy = input.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const d = Number(day), m = Number(month);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const parsed = Date.parse(input);
  if (Number.isFinite(parsed)) {
    const date = new Date(parsed);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').replace(/%/g, '').trim());
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
        const text = String(event.target?.result ?? '').replace(/^\uFEFF/, '');
        if (!text.trim()) throw new Error('The selected CSV file is empty.');

        // Let Papa Parse detect comma, semicolon or tab delimiters.
        // Do not pre-parse and re-serialize the file: that can corrupt quoted fields
        // and is unnecessary when the CSV starts with its header row.
        const parsed = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header: string) =>
            fieldNormalizer.normalizeHeaders([header])[0] || header.trim()
        });

        if (parsed.errors.length > 0) {
          console.warn('CSV parse warnings:', parsed.errors);
        }

        const headers = Object.keys(parsed.data[0] || {});
        const hasProductName = headers.includes('productName');
        const hasUsefulField = headers.some(header =>
          ['quantity', 'purchasePrice', 'sellingPrice', 'mrp'].includes(header)
        );
        if (!hasProductName || !hasUsefulField) {
          throw new Error(
            `CSV headers not recognised. Detected: ${headers.join(', ') || 'none'}. Required: Product Name and at least one of Quantity, Purchase Rate, Selling Price or MRP.`
          );
        }

        const products: ParsedProduct[] = [];
        for (const row of parsed.data) {
          const normalized = fieldNormalizer.normalizeInvoiceRow(row);
          const name = String(normalized.productName ?? '').trim();
          if (!name) continue;

          const quantity = parseNumber(normalized.quantity);
          const costPrice = parseNumber(normalized.purchasePrice);
          const sellingPrice = parseNumber(normalized.sellingPrice);
          const mrp = parseNumber(normalized.mrp);
          if ([quantity, costPrice, sellingPrice, mrp].every(value => value === null)) continue;

          const gst = parseNumber(normalized.gst);
          const category = String(normalized.category ?? '').trim() || null;
          const productCategory = String(normalized.productCategory ?? '').trim() || null;
          const subcategory = String(normalized.subcategory ?? '').trim() || null;
          const variant = String(normalized.variant ?? '').trim() || null;
          const batch = String(normalized.batch ?? '').trim() || null;
          const manufacturer = String(normalized.manufacturer ?? '').trim() || null;

          products.push({
            name,
            quantity,
            costPrice,
            sellingPrice,
            mrp,
            expiry: normalizeDate(normalized.expiry),
            batch,
            manufacturer,
            rawText: Object.values(row).filter(value => value !== null && value !== undefined && String(value).trim() !== '').join(' | '),
            category,
            sourceCategory: category,
            productCategory,
            subcategory,
            variant,
            packSize: variant || String(normalized.unit ?? '').trim() || null,
            barcode: String(normalized.barcode ?? '').trim() || null,
            sku: String(normalized.sku ?? '').trim() || null,
            gstRate: gst,
            gstSlab: gst !== null ? `${gst}%` : null,
            gstPercent: gst,
            hsnCode: String(normalized.hsn ?? '').trim() || null,
            weight: String(normalized.weight ?? '').trim() || null,
            unit: String(normalized.unit ?? '').trim() || null,
            confidence: 100,
            manufacturingDate: normalizeDate(normalized.manufacturingDate ?? normalized.mfgDate),
            mfgDate: normalizeDate(normalized.manufacturingDate ?? normalized.mfgDate),
            lowStockThreshold: parseNumber(normalized.lowStockThreshold),
            notes: String(normalized.notes ?? '').trim() || null,
            prescriptionRequired: parseBoolean(normalized.prescriptionRequired)
          });
        }

        if (products.length === 0) {
          throw new Error('The CSV headers were recognised, but no product rows were valid. Each row needs a Product Name and at least one of Quantity, Purchase Rate, Selling Price or MRP.');
        }

        resolve(products);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Could not read the CSV file. Please save it as UTF-8 CSV and try again.'));
    reader.readAsText(file, 'UTF-8');
  });
}
