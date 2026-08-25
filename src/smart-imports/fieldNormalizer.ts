import Papa from 'papaparse';
import { ParsedProduct } from './types';

function normalizeHeaderKey(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[_\s-]+/g, '');

  if (['product', 'item', 'name', 'description', 'itemname', 'productname', 'particulars'].includes(clean)) return 'productName';
  if (['hsn', 'hsncode', 'sac', 'saccode'].includes(clean)) return 'hsn';
  if (['barcode', 'upc', 'ean'].includes(clean)) return 'barcode';
  if (['batch', 'batchno', 'batchnumber', 'lot'].includes(clean)) return 'batch';
  if (['exp', 'expiry', 'expdate', 'expirydate', 'bestbefore'].includes(clean)) return 'expiry';
  if (['gst', 'gst%', 'gstrate', 'gstpercent', 'tax', 'tax%'].includes(clean)) return 'gst';
  if (['quantity', 'qty', 'stock', 'units', 'count', 'stockquantity', 'stockqty', 'quantityavailable', 'availablequantity'].includes(clean)) return 'quantity';
  if (['unit', 'uom', 'pack', 'packing', 'packsize'].includes(clean)) return 'unit';
  if (['cost', 'costprice', 'purchaseprice', 'rate', 'unitprice', 'buyprice', 'cp', 'ptr', 'pts', 'netrate'].includes(clean)) return 'purchasePrice';
  if (['price', 'priceinr', 'price(inr)', 'price(rs)', 'pricers', 'sellingprice', 'sellprice', 'retailprice', 'sp', 'maxretailprice'].includes(clean)) return 'sellingPrice';
  if (['mrp', 'mrpinr', 'mrp(inr)', 'mrprs', 'maximumretailprice'].includes(clean)) return 'mrp';
  if (['sku', 'itemcode', 'code'].includes(clean)) return 'sku';
  if (['scheme', 'schemepct', 'sch'].includes(clean)) return 'scheme';
  if (['schemedisc', 'schemediscount'].includes(clean)) return 'schemeDiscount';
  if (['manufacturer', 'mfg', 'company', 'brand'].includes(clean)) return 'manufacturer';
  if (['category', 'cat', 'group', 'vendorcategory', 'productcategory'].includes(clean)) return 'category';
  if (['subcategory', 'subcat', 'productsubcategory'].includes(clean)) return 'subcategory';
  if (['lowstockthreshold', 'lowstock', 'reorderlevel', 'reorderpoint'].includes(clean)) return 'lowStockThreshold';
  if (['variant', 'variantname', 'size', 'flavour', 'flavor'].includes(clean)) return 'variant';
  if (['notes', 'remarks', 'note'].includes(clean)) return 'notes';

  return clean;
}

export function normalizeHeaders(headers: string[]): string[] {
  return headers.map(header => normalizeHeaderKey(header));
}

export function normalizeInvoiceRow(row: Record<string, any>): Record<string, any> {
  const canonicalRow: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    canonicalRow[normalizeHeaderKey(key)] = value;
  }
  return canonicalRow;
}

export function normalizeFields(columns: string[]): Record<string, any> {
  const normalized: Record<string, any> = {};
  if (columns.length > 0 && columns[0]) normalized.productName = columns[0];
  if (columns.length > 1 && columns[1]) normalized.hsn = columns[1];
  if (columns.length > 2 && columns[2]) normalized.quantity = columns[2];
  if (columns.length > 3 && columns[3]) normalized.purchasePrice = columns[3];
  if (columns.length > 4 && columns[4]) normalized.mrp = columns[4];
  return normalized;
}

function isRealHeaderRow(row: string[]): boolean {
  const knownKeywords = [
    'product', 'item', 'name', 'description', 'particulars', 'hsn', 'sac',
    'qty', 'quantity', 'rate', 'price', 'mrp', 'cost', 'amount', 'barcode',
    'batch', 'expiry', 'gst', 'sku', 'unit', 'stock', 'stockquantity', 'ptr', 'pts'
  ];

  let matches = 0;
  for (const cell of row) {
    if (!cell) continue;
    const normalized = normalizeHeaderKey(cell);
    if (knownKeywords.includes(normalized) || ['productName', 'hsn', 'quantity', 'purchasePrice', 'sellingPrice', 'mrp'].includes(normalized)) matches++;
  }
  return matches >= 2;
}

export async function parseCsvFile(file: File): Promise<ParsedProduct[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return resolve([]);

        const preliminaryParse = Papa.parse(text, { header: false, skipEmptyLines: 'greedy' });
        const rawRows = preliminaryParse.data as string[][];
        let headerRowIndex = 0;

        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          if (isRealHeaderRow(rawRows[i])) {
            headerRowIndex = i;
            break;
          }
        }

        const adjustedCsvText = Papa.unparse(rawRows.slice(headerRowIndex));

        Papa.parse(adjustedCsvText, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header: string) => normalizeHeaderKey(header),
          complete: (results) => {
            try {
              const rows = results.data as Record<string, string>[];
              const parsedProducts: ParsedProduct[] = [];

              for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                if (!Object.values(row).some(v => v !== null && v !== undefined && String(v).trim())) continue;

                const normalized = normalizeInvoiceRow(row);
                const name = normalized.productName || null;
                const quantityVal = normalized.quantity ? parseFloat(String(normalized.quantity).replace(/,/g, '')) : null;
                const costVal = normalized.purchasePrice ? parseFloat(String(normalized.purchasePrice).replace(/,/g, '')) : null;
                const sellingPriceVal = normalized.sellingPrice ? parseFloat(String(normalized.sellingPrice).replace(/,/g, '')) : null;
                const mrpVal = normalized.mrp ? parseFloat(String(normalized.mrp).replace(/,/g, '')) : null;
                const gstVal = normalized.gst ? parseFloat(String(normalized.gst).replace(/%/g, '').trim()) : null;

                const hasName = Boolean(name && String(name).trim());
                const hasNumericField = [quantityVal, costVal, sellingPriceVal, mrpVal].some(v => v !== null && !isNaN(v));

                if (!hasName || !hasNumericField) {
                  console.log(`[CSV Debug] Discarded row ${index}: missing product name or numeric product field`, { name, quantityVal, costVal, sellingPriceVal, mrpVal });
                  continue;
                }

                const parsedProduct: ParsedProduct = {
                  name: String(name).trim(),
                  quantity: isNaN(quantityVal as number) ? null : quantityVal,
                  costPrice: isNaN(costVal as number) ? null : costVal,
                  sellingPrice: isNaN(sellingPriceVal as number) ? null : sellingPriceVal,
                  mrp: isNaN(mrpVal as number) ? null : mrpVal,
                  expiry: normalizeDate(normalized.expiry || null),
                  batch: normalized.batch || null,
                  manufacturer: normalized.manufacturer || null,
                  rawText: Object.values(row).filter(Boolean).join(' | '),
                  barcode: normalized.barcode || null,
                  sku: normalized.sku || null,
                  gstRate: isNaN(gstVal as number) ? null : gstVal,
                  gstSlab: gstVal !== null && !isNaN(gstVal) ? `${gstVal}%` : null,
                  gstPercent: isNaN(gstVal as number) ? null : gstVal,
                  hsnCode: normalized.hsn || null,
                  weight: normalized.weight || null,
                  unit: normalized.unit || null,
                  confidence: 100,
                  manufacturingDate: normalizeDate(normalized.mfgDate || normalized.manufacturingDate || null),
                  mfgDate: normalizeDate(normalized.mfgDate || normalized.manufacturingDate || null)
                };

                parsedProducts.push(parsedProduct);
              }

              resolve(parsedProducts);
            } catch (err) {
              reject(err);
            }
          },
          error: (error: any) => reject(error)
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const yearMonthMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (yearMonthMatch) {
    const [, y, m] = yearMonthMatch;
    const monthNum = parseInt(m, 10);
    if (monthNum >= 1 && monthNum <= 12) return `${y}-${String(monthNum).padStart(2, '0')}-01`;
  }

  const monthYearMatch = trimmed.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (monthYearMatch) {
    const [, m, y] = monthYearMatch;
    const monthNum = parseInt(m, 10);
    if (monthNum >= 1 && monthNum <= 12) return `${y}-${String(monthNum).padStart(2, '0')}-01`;
  }

  const monthTwoDigitYearMatch = trimmed.match(/^(\d{1,2})-(\d{2})$/);
  if (monthTwoDigitYearMatch) {
    const [, m, yy] = monthTwoDigitYearMatch;
    const monthNum = parseInt(m, 10);
    if (monthNum >= 1 && monthNum <= 12) return `${2000 + parseInt(yy, 10)}-${String(monthNum).padStart(2, '0')}-01`;
  }

  const fullDateMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (fullDateMatch) {
    const [, d, m, y] = fullDateMatch;
    const dayNum = parseInt(d, 10);
    const monthNum = parseInt(m, 10);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) return `${y}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const dateObj = new Date(parsed);
    const y = dateObj.getFullYear();
    if (y > 1970 && y < 2100) return `${y}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  }

  return null;
}