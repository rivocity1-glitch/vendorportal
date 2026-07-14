/**
 * Bypasses the active multi-phase token sequence classification layout engine.
 * Directly maps out structural text rows extracted from the source matrix 
 * to preserve original visual line boundaries for downstream template validation.
 * * @param text The raw multi-line text layout string from the document.
 * @returns An array of individual trimmed text line rows.
 */
export function reconstructInvoiceTable(text: string): string[] {
  if (!text) return [];

  const rows = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  console.log("Reconstructor bypassed", rows.length);

  return rows;
}