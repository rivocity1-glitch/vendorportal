import Papa from 'papaparse';
import { ParsedProduct } from './types';
import * as fieldNormalizer from './fieldNormalizer';

/**
 * Reusable helper to normalize various date formats into PostgreSQL 'YYYY-MM-DD'.
 * Supports MM/YYYY, M/YYYY, MM-YY, MM-YYYY, YYYY-MM, YYYY/MM, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY.
 */
function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;

  // Already ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // YYYY-MM or YYYY/MM -> first day
  const yearMonthMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (yearMonthMatch) {
    const [, y, m] = yearMonthMatch;
    const monthNum = parseInt(m, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${y}-${String(monthNum).padStart(2, '0')}-01`;
    }
  }

  // MM/YYYY or M/YYYY or MM-YYYY
  const monthYearMatch = trimmed.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (monthYearMatch) {
    const [, m, y] = monthYearMatch;
    const monthNum = parseInt(m, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${y}-${String(monthNum).padStart(2, '0')}-01`;
    }
  }

  // MM-YY (e.g. 12-27 -> 2027-12-01)
  const monthTwoDigitYearMatch = trimmed.match(/^(\d{1,2})-(\d{2})$/);
  if (monthTwoDigitYearMatch) {
    const [, m, yy] = monthTwoDigitYearMatch;
    const monthNum = parseInt(m, 10);
    const yearNum = 2000 + parseInt(yy, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const fullDateMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (fullDateMatch) {
    const [, d, m, y] = fullDateMatch;
    const dayNum = parseInt(d, 10);
    const monthNum = parseInt(m, 10);
    const yearNum = parseInt(y, 10);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }
  }

  // Fallback: Try parsing native Date if standard string format
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const dateObj = new Date(parsed);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    if (y > 1970 && y < 2100) {
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

/**
 * Ingests a CSV File object, parses it using PapaParse, normalizes headers and rows via fieldNormalizer,
 * applies flexible row-acceptance logic, and logs debugging metrics.
 *
 * @param file The CSV File object to parse.
 * @returns A promise resolving to an array of ParsedProduct objects.
 */
export async function parseCsvFile(file: File): Promise<ParsedProduct[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          resolve([]);
          return;
        }

        const preliminaryParse = Papa.parse(text, {
          header: false,
          skipEmptyLines: 'greedy'
        });

        const rawRows = preliminaryParse.data as string[][];
        let headerRowIndex = 0;

        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const rowData = rawRows[i] || [];
          const normalizedTest = (fieldNormalizer as any).normalizeHeaders 
            ? (fieldNormalizer as any).normalizeHeaders(rowData) 
            : rowData;
          const matchedCount = (normalizedTest as string[]).filter((h: string) => h && h.trim().length > 0).length;
          if (matchedCount >= 2) {
            headerRowIndex = i;
            break;
          }
        }

        const adjustedRows = rawRows.slice(headerRowIndex);
        const adjustedCsvText = Papa.unparse(adjustedRows);

        Papa.parse(adjustedCsvText, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header: string) => {
            const normalized = (fieldNormalizer as any).normalizeHeaders 
              ? (fieldNormalizer as any).normalizeHeaders([header]) 
              : [header];
            return normalized[0] || header.trim();
          },
          complete: (results: Papa.ParseResult<Record<string, any>>) => {
            try {
              const rows = results.data as Record<string, any>[];
              console.log('[CSV Debug] Parsed headers (meta.fields):', results.meta.fields);
              console.log('[CSV Debug] Total rows read from CSV:', rows.length);

              const parsedProducts: ParsedProduct[] = [];

              for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                
                let hasData = false;
                for (const val of Object.values(row)) {
                  if (val !== null && val !== undefined && String(val).trim().length > 0) {
                    hasData = true;
                    break;
                  }
                }

                if (!hasData) {
                  console.log(`[CSV Debug] Discarded row ${index}: Reason -> Row is completely empty.`);
                  continue;
                }

                const normalized = (fieldNormalizer as any).normalizeInvoiceRow 
                  ? (fieldNormalizer as any).normalizeInvoiceRow(row) 
                  : ((fieldNormalizer as any).normalizeFields ? (fieldNormalizer as any).normalizeFields(Object.values(row)) : row);

                console.log(`[CSV Debug] Normalized row ${index}:`, normalized);

                const name = normalized.productName || normalized.name || row['Product'] || row['name'] || row['Item'] || Object.values(row)[0] || null;
                const quantityVal = normalized.quantity !== null && normalized.quantity !== undefined && String(normalized.quantity).trim() !== ''
                  ? parseFloat(String(normalized.quantity).replace(/,/g, ''))
                  : (row['Qty'] ? parseFloat(String(row['Qty']).replace(/,/g, '')) : null);
                const costVal = normalized.purchasePrice !== null && normalized.purchasePrice !== undefined && String(normalized.purchasePrice).trim() !== ''
                  ? parseFloat(String(normalized.purchasePrice).replace(/,/g, ''))
                  : (row['Rate'] ? parseFloat(String(row['Rate']).replace(/,/g, '')) : (row['Amount'] ? parseFloat(String(row['Amount']).replace(/,/g, '')) : null));
                const mrpVal = normalized.mrp !== null && normalized.mrp !== undefined && String(normalized.mrp).trim() !== ''
                  ? parseFloat(String(normalized.mrp).replace(/,/g, ''))
                  : null;
                const gstVal = normalized.gst !== null && normalized.gst !== undefined && String(normalized.gst).trim() !== ''
                  ? parseFloat(String(normalized.gst).replace(/%/g, '').trim())
                  : null;

                const hasName = Boolean(name && String(name).trim().length > 0);
                const hasNumericField = (quantityVal !== null && !isNaN(quantityVal)) ||
                                        (costVal !== null && !isNaN(costVal)) ||
                                        (mrpVal !== null && !isNaN(mrpVal));

                if (!hasName || !hasNumericField) {
                  console.log(`[CSV Debug] Discarded row ${index}: Reason -> Missing required Product Name or minimum one numeric field (Quantity/PurchasePrice/MRP).`, { name, quantityVal, costVal, mrpVal, normalized, row });
                  continue;
                }

                const rawTextTokens = Object.values(row).filter(Boolean);
                const rawText = rawTextTokens.join(' | ');

                const normalizedExpiry = normalizeDate(normalized.expiry || row['Expiry'] || row['Exp'] || null);
                const normalizedMfg = normalizeDate(normalized.mfgDate || normalized.manufacturingDate || row['Mfg Date'] || row['Manufacturing Date'] || null);

                const parsedProduct: ParsedProduct = {
                  name: name,
                  quantity: isNaN(quantityVal as number) ? null : quantityVal,
                  costPrice: isNaN(costVal as number) ? null : costVal,
                  mrp: isNaN(mrpVal as number) ? null : mrpVal,
                  expiry: normalizedExpiry,
                  batch: normalized.batch || null,
                  manufacturer: normalized.manufacturer || null,
                  rawText: rawText,
                  barcode: normalized.barcode || null,
                  sku: normalized.sku || null,
                  gstRate: isNaN(gstVal as number) ? null : gstVal,
                  gstSlab: gstVal !== null && !isNaN(gstVal) ? `${gstVal}%` : null,
                  gstPercent: isNaN(gstVal as number) ? null : gstVal,
                  hsnCode: normalized.hsn || normalized.hsnCode || row['HSN'] || null,
                  weight: normalized.weight || null,
                  unit: normalized.unit || row['Unit'] || null,
                  confidence: 100,
                  manufacturingDate: normalizedMfg,
                  mfgDate: normalizedMfg
                };

                console.log(`[CSV Debug] Accepted row ${index}:`, parsedProduct);
                parsedProducts.push(parsedProduct);
              }

              console.log(`[CSV Debug] Final parsed array count: ${parsedProducts.length}`);
              resolve(parsedProducts);
            } catch (err) {
              console.error('[CSV Debug] Error during CSV post-processing:', err);
              reject(err);
            }
          },
          error: (error: Error) => {
            console.error('[CSV Debug] Papa Parse error:', error);
            reject(error);
          }
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error: ProgressEvent<FileReader>) => reject(error);
    reader.readAsText(file);
  });
}