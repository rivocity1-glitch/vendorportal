import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Type definitions for strict typing
interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface VendorDetails {
  name: string;
  address?: string;
  phone?: string;
}

interface CustomerDetails {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface OrderData {
  invoiceNumber: string;
  orderId: string;
  date: string;
  vendor: VendorDetails;
  customer: CustomerDetails;
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
}

/**
 * Generates a Rivo.City invoice PDF and returns it as a Blob.
 * @param orderData The complete order details required for the invoice.
 * @returns Promise<Blob>
 */
export const generateInvoice = async (orderData: OrderData): Promise<Blob> => {
  // Create a new jsPDF instance (A4 size, portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // --- 1. HEADER (Rivo.City) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(40, 116, 240); // Brand primary color example
  doc.text('Rivo.City', margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Official Marketplace Invoice', margin, 25);

  // --- 2. INVOICE META METRICS (Right Aligned) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', pageWidth - margin, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Invoice No: ${orderData.invoiceNumber}`, pageWidth - margin, 26, { align: 'right' });
  doc.text(`Order ID: ${orderData.orderId}`, pageWidth - margin, 31, { align: 'right' });
  doc.text(`Date: ${orderData.date}`, pageWidth - margin, 36, { align: 'right' });

  // Divider Line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, 42, pageWidth - margin, 42);

  // --- 3. VENDOR & CUSTOMER DETAILS ---
  const detailsY = 50;
  
  // Vendor Block (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Vendor Details:', margin, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(orderData.vendor.name, margin, detailsY + 6);
  if (orderData.vendor.address) doc.text(orderData.vendor.address, margin, detailsY + 11);
  if (orderData.vendor.phone) doc.text(`Phone: ${orderData.vendor.phone}`, margin, detailsY + 16);

  // Customer Block (Right)
  const customerX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Bill To:', customerX, detailsY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(orderData.customer.name, customerX, detailsY + 6);
  if (orderData.customer.address) doc.text(orderData.customer.address, customerX, detailsY + 11);
  if (orderData.customer.phone || orderData.customer.email) {
    const contact = orderData.customer.phone || orderData.customer.email || '';
    doc.text(contact, customerX, detailsY + 16);
  }

  // --- 4. PRODUCT LIST TABLE ---
  const tableHeaders = [['Product Description', 'Quantity', 'Unit Price', 'Total']];
  const tableRows = orderData.items.map((item) => [
    item.name,
    item.quantity.toString(),
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`,
  ]);

  // Using autoTable plugin attached to jsPDF instance
  (doc as any).autoTable({
    startY: 75,
    head: tableHeaders,
    body: tableRows,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: { fillColor: [40, 116, 240], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  });

  // --- 5. SUMMARY / TOTALS SECTION ---
  // Get the Y position where the table ended dynamically
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const summaryX = pageWidth - margin - 60;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  // Subtotal Row
  doc.text('Subtotal:', summaryX, finalY);
  doc.text(`$${orderData.subtotal.toFixed(2)}`, pageWidth - margin, finalY, { align: 'right' });

  // Delivery Fee Row
  doc.text('Delivery Fee:', summaryX, finalY + 6);
  doc.text(`$${orderData.deliveryFee.toFixed(2)}`, pageWidth - margin, finalY + 6, { align: 'right' });

  // Grand Total Row
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text('Grand Total:', summaryX, finalY + 13);
  doc.text(`$${orderData.grandTotal.toFixed(2)}`, pageWidth - margin, finalY + 13, { align: 'right' });

  // --- 6. FOOTER (Static Brand Messaging) ---
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Thank you for shopping with Rivo.City - ${orderData.vendor.name}`,
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'Support Email: rivocityhelp1@gmail.com',
    pageWidth / 2,
    pageHeight - 14,
    { align: 'center' }
  );

  // --- 7. RETURN AS BLOB ---
  return doc.output('blob');
};