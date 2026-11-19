import Papa from 'papaparse';

function normalizeHeaderKey(header: string): string {
  // Normalise headers from Excel, Google Sheets, accounting exports and supplier
  // systems. Ignore BOMs, punctuation, currency symbols and unit annotations.
  const clean = header
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');

  // Product identity
  if ([
    'product', 'item', 'name', 'description', 'itemname', 'productname',
    'particulars', 'itemdescription', 'productdescription', 'producttitle',
    'itemtitle', 'nameofproduct', 'nameofitem', 'productservice',
    'goodsdescription', 'materialdescription'
  ].includes(clean)) return 'productName';

  // Tax, identifiers and traceability
  if (['hsn', 'hsncode', 'sac', 'saccode', 'hsnsac'].includes(clean)) return 'hsn';
  if (['barcode', 'upc', 'ean', 'ean13', 'gtin', 'itembarcode'].includes(clean)) return 'barcode';
  if (['sku', 'itemcode', 'productcode', 'stockcode', 'code', 'materialcode'].includes(clean)) return 'sku';
  if (['batch', 'batchno', 'batchnumber', 'lot', 'lotno', 'lotnumber'].includes(clean)) return 'batch';
  if (['exp', 'expiry', 'expdate', 'expirydate', 'bestbefore', 'bestbeforedate'].includes(clean)) return 'expiry';
  if (['manufacturingdate', 'mfgdate', 'manufacturedate', 'productiondate'].includes(clean)) return 'manufacturingDate';
  if (['gst', 'gstpercent', 'gstrate', 'tax', 'taxpercent', 'vat', 'vatpercent', 'igstpercent'].includes(clean) || clean.startsWith('gst')) return 'gst';

  // Stock and packaging
  if (['quantity', 'qty', 'qtypcs', 'stock', 'units', 'count', 'stockquantity', 'stockqty', 'quantityavailable', 'availablequantity', 'closingstock', 'openingstock', 'onhand', 'onhandquantity'].includes(clean)) return 'quantity';
  if (['unit', 'uom', 'pack', 'packing', 'packsize', 'unitofmeasure', 'measurementunit'].includes(clean)) return 'unit';
  if (['lowstockthreshold', 'lowstock', 'reorderlevel', 'reorderpoint', 'minimumstock'].includes(clean)) return 'lowStockThreshold';

  // Purchase / cost price
  if ([
    'cost', 'costprice', 'purchaseprice', 'purchaserate', 'buyrate',
    'wholesalerate', 'rate', 'unitprice', 'buyprice', 'cp', 'ptr', 'pts',
    'netrate', 'landingcost', 'landedcost', 'basicrate', 'vendorprice',
    'supplierprice', 'purchasecost', 'costperunit'
  ].includes(clean)) return 'purchasePrice';
  if (clean.startsWith('purchase') || clean.startsWith('costprice') || clean === 'ptr' || clean === 'pts') return 'purchasePrice';

  // Customer-facing selling price
  if ([
    'price', 'priceinr', 'pricers', 'sellingprice', 'sellingrate',
    'sellprice', 'retailprice', 'sp', 'unitretailprice', 'salesprice',
    'saleprice', 'unit selling price', 'mrpvalue'
  ].includes(clean)) return 'sellingPrice';
  if (clean.startsWith('selling') || clean.startsWith('retail') || clean.startsWith('saleprice')) return 'sellingPrice';

  // MRP is separate from selling price
  if (['mrp', 'maximumretailprice', 'maxretailprice', 'listprice', 'markedprice'].includes(clean) || clean.startsWith('mrp')) return 'mrp';

  if (['scheme', 'schemepct', 'sch'].includes(clean)) return 'scheme';
  if (['schemedisc', 'schemediscount'].includes(clean)) return 'schemeDiscount';
  if (['manufacturer', 'mfg', 'company', 'brand', 'brandname', 'make'].includes(clean)) return 'manufacturer';

  // Keep vendor/category/subcategory fields distinct.
  if (['vendorcategory', 'category', 'cat', 'group', 'department', 'productgroup'].includes(clean)) return 'category';
  if (['productcategory', 'productcat', 'category1'].includes(clean)) return 'productCategory';
  if (['subcategory', 'subcat', 'productsubcategory'].includes(clean)) return 'subcategory';
  if (['variant', 'variantname', 'size', 'flavour', 'flavor', 'colour', 'color'].includes(clean)) return 'variant';
  if (['weight', 'netweight', 'grossweight'].includes(clean)) return 'weight';
  if (['shelf', 'location', 'shelflocation', 'storelocation', 'binlocation'].includes(clean)) return 'shelfLocation';
  if (['notes', 'remarks', 'note', 'comments'].includes(clean)) return 'notes';
  if (['prescriptionrequired', 'prescription', 'rxrequired'].includes(clean)) return 'prescriptionRequired';

  return clean;
}

export function normalizeHeaders(headers: string[]): string[] {
  return headers.map(normalizeHeaderKey);
}

export function normalizeInvoiceRow(row: Record<string, any>): Record<string, any> {
  const canonicalRow: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeaderKey(key);
    canonicalRow[normalizedKey] = value;
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

function isRealHeaderRow(row: string[]): boolean {
  const knownKeywords = [
    'product', 'item', 'name', 'description', 'particulars', 'hsn', 'sac',
    'qty', 'quantity', 'rate', 'price', 'mrp', 'cost', 'amount', 'barcode',
    'batch', 'expiry', 'gst', 'sku', 'unit', 'stock', 'stockquantity', 'ptr', 'pts',
    'vendorcategory', 'productcategory', 'subcategory', 'variant'
  ];

  let matches = 0;
  for (const cell of row) {
    if (!cell) continue;
    const normalized = normalizeHeaderKey(cell);
    if (knownKeywords.includes(normalized) || ['productName', 'hsn', 'quantity', 'purchasePrice', 'sellingPrice', 'mrp'].includes(normalized)) matches++;
  }
  return matches >= 2;
}

export async function parseCsvFile(file: File) {
  return new Promise<any[]>((resolve, reject) => {
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
              const rows = results.data as Record<string, any>[];
              const parsedProducts: any[] = [];

              for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                if (!Object.values(row).some(v => v !== null && v !== undefined && String(v).trim())) continue;

                const normalized = normalizeInvoiceRow(row);
                const name = normalized.productName || null;
                const quantityVal = parseNumber(normalized.quantity);
                const costVal = parseNumber(normalized.purchasePrice);
                const sellingPriceVal = parseNumber(normalized.sellingPrice);
                const mrpVal = parseNumber(normalized.mrp);
                const gstVal = parseNumber(normalized.gst);
                const lowStockThreshold = parseNumber(normalized.lowStockThreshold);

                const hasName = Boolean(name && String(name).trim());
                const hasNumericField = [quantityVal, costVal, sellingPriceVal, mrpVal].some(v => v !== null);

                if (!hasName || !hasNumericField) continue;

                const sourceCategory = normalized.category ? String(normalized.category).trim() : null;
                const productCategory = normalized.productCategory ? String(normalized.productCategory).trim() : null;
                const subcategory = normalized.subcategory ? String(normalized.subcategory).trim() : null;
                const variant = normalized.variant ? String(normalized.variant).trim() : null;

                parsedProducts.push({
                  name: String(name).trim(),
                  quantity: quantityVal,
                  costPrice: costVal,
                  sellingPrice: sellingPriceVal,
                  mrp: mrpVal,
                  expiry: normalizeDate(normalized.expiry || null),
                  batch: normalized.batch || null,
                  manufacturer: normalized.manufacturer || null,
                  rawText: Object.values(row).filter(Boolean).join(' | '),
                  barcode: normalized.barcode || null,
                  sku: normalized.sku || null,
                  gstRate: gstVal,
                  gstSlab: gstVal !== null ? `${gstVal}%` : null,
                  gstPercent: gstVal,
                  hsnCode: normalized.hsn || null,
                  weight: normalized.weight || null,
                  unit: normalized.unit || null,
                  confidence: 100,
                  manufacturingDate: normalizeDate(normalized.mfgDate || normalized.manufacturingDate || null),
                  mfgDate: normalizeDate(normalized.mfgDate || normalized.manufacturingDate || null),
                  category: sourceCategory,
                  sourceCategory,
                  productCategory,
                  subcategory,
                  variant,
                  packSize: variant || normalized.unit || null,
                  lowStockThreshold,
                  notes: normalized.notes ? String(normalized.notes).trim() : null,
                  prescriptionRequired: parseBoolean(normalized.prescriptionRequired)
                });
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