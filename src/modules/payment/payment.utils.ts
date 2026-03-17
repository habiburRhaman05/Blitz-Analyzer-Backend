import PDFDocument from 'pdfkit';
import { IInvoicePayload } from './payment.interface';

export const generatePaymentInvoiceBuffer = (data: IInvoicePayload): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // --- Theme based on status ---
    const isSuccess = data.status === 'COMPLETE';
    const themeColor = isSuccess ? '#0070f3' : '#e11d48'; // Blue for success, Red for failure
    const bgColor = isSuccess ? '#e0f2ff' : '#ffe5e5';     // Light blue / light red
    const textColor = isSuccess ? '#0b3d91' : '#b91c1c';
    const statusLabel = isSuccess ? 'Payment Receipt' : 'Payment Failure Notice';

    // --- Header ---
    doc.fillColor(themeColor).fontSize(22).text('Blitz-Analyzer', { align: 'left' });
    doc.fontSize(12).fillColor('#444').text(statusLabel, { align: 'left' });
    doc.moveDown();

    // --- Invoice Info ---
    doc.fillColor('#000').fontSize(10)
       .text(`Invoice No: ${data.invoiceNumber}`, { align: 'right' })
       .text(`Date: ${data.paymentTime}`, { align: 'right' });
    doc.moveTo(50, 110).lineTo(550, 110).strokeColor('#eeeeee').stroke();

    // --- Billing Details ---
    doc.moveDown(2);
    doc.fontSize(12).fillColor(themeColor).text('Bill To:', 50);
    doc.fontSize(11).fillColor('#000')
       .text(`Name: ${data.userName}`)
       .text(`Email: ${data.userEmail}`)
       .text(`Payment Method: ${data.paymentMethod}`)
       .text(`Status: ${data.status}`, { oblique: true });

    // --- Table Header ---
    const tableTop = 240;
    doc.rect(50, tableTop, 500, 20).fill('#f9fafb');
    doc.fillColor('#444').fontSize(10)
       .text('Description', 60, tableTop + 5)
       .text('Credits', 300, tableTop + 5)
       .text('Amount', 480, tableTop + 5);

    // --- Table Row ---
    const rowY = tableTop + 30;
    doc.fillColor('#000')
       .text(`${data.planName} Plan`, 60, rowY)
       .text(`${data.credits} Credits`, 300, rowY)
       .text(`$${data.amount.toFixed(2)}`, 480, rowY);

    doc.moveTo(50, rowY + 20).lineTo(550, rowY + 20).strokeColor('#eeeeee').stroke();

    // --- Grand Total ---
    doc.fontSize(14).fillColor(themeColor)
       .text(`Total Amount: $${data.amount.toFixed(2)}`, 380, rowY + 40);

    // --- Status Message Box ---
    doc.moveDown(5);
    const boxY = doc.y;
    doc.rect(50, boxY, 500, 45).fill(bgColor);
    doc.fillColor(textColor).fontSize(11)
       .text(data.message, 65, boxY + 15, { align: 'center', width: 470 });

    // --- Footer ---
    doc.fillColor('#999').fontSize(8)
       .text('Blitz-Analyzer • support@blitz-analyzer.com • www.blitz-analyzer.com', 50, 780, { align: 'center' });

    doc.end();
  });
};