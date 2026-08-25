import Papa from 'papaparse';
import { ParsedProduct } from './types';

/**
 * Standardizes common CSV or table header variations to expected canonical column keys.
 */
function normalizeHeaderKey(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[_\s-]+/g, '');
  
  if (['product', 'item', 'name', 'description', 'itemname', 'productname', 'particulars'].includes(clean)) {
    return 'productName';
  }
  if (['hsn', 'hsncode', 'sac', 'saccode'].includes(clean)) {
    return 'hsn';
  }
  if (['barcode', 'upc', 'ean'].includes(clean)) {
    return 'barcode';
  }
  if (['batch', 'batchno', 'batchnumber', 'lot'].includes(clean)) {
    return 'batch';
  }
  if (['exp', 'expiry', 'expdate', 'expirydate', 'bestbefore'].includes(clean)) {
    return 'expiry';
  }
  if (['gst', 'gst%', 'gstrate', 'gstpercent', 'tax', 'tax%'].includes(clean)) {
    return 'gst';
  }
  if (['quantity', 'qty', 'stock', 'units', 'count', 'stockquantity', 'stockqty', 'quantityavailable', 'availablequantity'].includes(clean)) {
    return 'quantity';
  }
  if (['unit', 'uom', 'pack', 'packing', 'packsize'].includes(clean)) {
    return 'unit';
  }
  if (['cost', 'costprice', 'purchaseprice', 'rate', 'unitprice', 'buyprice', 'cp', 'ptr', 'pts', 'netrate'].includes(clean)) {
    return 'purchasePrice';
  }
  if (['price', 'priceinr', 'price(rs)', 'pricers', 'sellingprice', 'sellprice', 'retailprice', 'sp', 'maxretailprice'].includes(clean)) {
    return 'sellingPrice';
  }
  if (['mrp', 'mrpinr', 'mrprs', 'maximumretailprice'].includes(clean)) {
    return 'mrp';
  }
  if (['sku', 'itemcode', 'code'].includes(clean)) {
    return 'sku';
  }
  if (['scheme', 'schemepct', 'sch'].includes(clean)) {
    return 'scheme';
  }
  if (['schemedisc', 'schemediscount'].includes(clean)) {
    return 'schemeDiscount';
  }
  if (['manufacturer', 'mfg', 'company', 'brand'].includes(clean)) {
    return 'manufacturer';
  }
  if (['category', 'cat', 'group', 'vendorcategory', 'productcategory'].includes(clean)) {
    return 'category';
  }
  if (['subcategory', 'subcat', 'productsubcategory'].includes(clean)) {
    return 'subcategory';
  }
  if (['lowstockthreshold', 'lowstock', 'reorderlevel', 'reorderpoint'].includes(clean)) {
    return 'lowStockThreshold';
  }
  if (['variant', 'variantname', 'size', 'flavour', 'flavor'].includes(clean)) {
    return 'variant';
  }
  if (['notes', 'remarks', 'note'].includes(clean)) {
    return 'notes';
  }

  return clean;
}

/**
 * Normalizes an array of header strings into canonical keys.
 */
export function normalizeHeaders(headers: string[]): string[] {
  return headers.map(header => normalizeHeaderKey(header));
}

/**
 * Normalizes a row object with supplier-specific headers into a canonical key-value record.
 */
export function normalizeInvoiceRow(row: Record<string, any>): Record<string, any> {
  console.log('[FieldNormalizer Debug] Original row:', row);

  const canonicalRow: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    const canonicalKey = normalizeHeaderKey(key);
    canonicalRow[canonicalKey] = value;
  }

  console.log('[FieldNormalizer Debug] Canonical row:', canonicalRow);
  return canonicalRow;
}

/**
 * Normalizes an array of column values or structured fields using header mapping or sequence detection.
 */
export function normalizeFields(columns: string[]): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  if (columns.length > 0 && columns[0]) {
    normalized.productName = columns[0];
  }
  if (columns.length > 1 && columns[1]) {
    normalized.hsn = columns[1];
  }
  if (columns.length > 2 && columns[2]) {
    normalized.quantity = columns[2];
  }
  if (columns.length > 3 && columns[3]) {
    normalized.purchasePrice = columns[3];
  }
  if (columns.length > 4 && columns[4]) {
    normalized.mrp = columns[4];
  }

  return normalized;
}

/**
 * Checks if a given row contains at least two known header column keywords.
 */
function isRealHeaderRow(row: string[]): boolean {
  const knownKeywords = [
    'product', 'item', 'name', 'description', 'particulars',
    'hsn', 'sac', 'qty', 'quantity', 'rate', 'price', 'mrp', 'cost',
    'amount', 'barcode', 'batch', 'expiry', 'gst', 'sku', 'unit', 'stock', 'stockquantity', 'ptr', 'pts'
  ];

  let matches = 0;
  for (const cell of row) {
    if (!cell) continue;
    const normalized = normalizeHeaderKey(cell);
    if (knownKeywords.includes(normalized) || ['productName', 'hsn', 'quantity', 'purchasePrice', 'sellingPrice', 'mrp'].includes(normalized)) {
      matches++;
    }
  }

  return matches >= 2;
}

/**
 * Ingests a CSV File object, dynamically detects the real header row by skipping title lines,
 * parses it using PapaParse, and normalizes rows into standard ParsedProduct shapes.
 *
 * @param file The CSV File object to parse.
 * @returns A promise resolving to an array of ParsedProduct objects.
 */
export async function parseCsvFile(file: File): Promise<ParsedProduct[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
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
          if (isRealHeaderRow(rawRows[i])) {
            headerRowIndex = i;
            break;
          }
        }

        const adjustedRows = rawRows.slice(headerRowIndex);
        const adjustedCsvText = Papa.unparse(adjustedRows);

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
                const normalized = normalizeInvoiceRow(row);

                let hasData = false;
                for (const val of Object.values(normalized)) {
                  if (val !== null && val !== undefined && String(val).trim().length > 0) {
                    hasData = true;
                    break;
                  }
                }

                if (!hasData) continue;

                const name = normalized.productName || null;
                const quantityVal = normalized.quantity ? parseFloat(String(normalized.quantity).replace(/,/g, '')) : null;
                const costVal = normalized.purchasePrice ? parseFloat(String(normalized.purchasePrice).replace(/,/g, '')) : null;
                const sellingPriceVal = normalized.sellingPrice ? parseFloat(String(normalized.sellingPrice).replace(/,/g, '')) : null;
                const mrpVal = normalized.mrp ? parseFloat(String(normalized.mrp).replace(/,/g, '')) : null;
                const gstVal = normalized.gst ? parseFloat(String(normalized.gst).replace(/%/g, '').trim()) : null;

                const rawTextTokens = Object.values(row).filter(Boolean);
                const rawText = rawTextTokens.join(' | ');

                if (!name && quantityVal === null && costVal === null && sellingPriceVal === null && mrpVal === null) {
                  continue;
                }

                const parsedProduct: ParsedProduct = {
                  name: name,
                  quantity: isNaN(quantityVal as number) ? null : quantityVal,
                  costPrice: isNaN(costVal as number) ? null : costVal,
                  sellingPrice: isNaN(sellingPriceVal as number) ? null : sellingPriceVal,
                  mrp: isNaN(mrpVal as number) ? null : mrpVal,
                  expiry: normalized.expiry || null,
                  batch: normalized.batch || null,
                  manufacturer: normalized.manufacturer || null,
                  rawText: rawText,
                  barcode: normalized.barcode || null,
                  sku: normalized.sku || null,
                  gstRate: isNaN(gstVal as number) ? null : gstVal,
                  gstSlab: gstVal !== null && !isNaN(gstVal) ? `${gstVal}%` : null,
                  gstPercent: isNaN(gstVal as number) ? null : gstVal,
                  hsnCode: normalized.hsn || null,
                  weight: normalized.weight || null,
                  unit: normalized.unit || null,
                  confidence: 100,
                  manufacturingDate: normalized.mfgDate || null,
                  mfgDate: normalized.mfgDate || null
                };

                parsedProducts.push(parsedProduct);
              }

              resolve(parsedProducts);
            } catch (err) {
              reject(err);
            }
          },
          error: (error: any) => {
            reject(error);
          }
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}