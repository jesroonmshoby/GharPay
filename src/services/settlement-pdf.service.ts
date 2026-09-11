import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface SettlementPdfData {
  disputeId: string;
  caseNumber: string;
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  securityDeposit: string;
  calculatedDeduction: string;
  agreedDeduction: string;
  refundAmount: string;
  roundsSummary: Array<{
    roundNumber: number;
    landlordOffer: string | null;
    tenantOffer: string | null;
  }>;
  mediatorName: string;
  tenantConsentedAt: string;
  landlordConsentedAt: string;
}

export interface GeneratedPdfResult {
  pdfPath: string;
  settlementHash: string;
}

/**
 * Generates a PDF settlement document, saves it locally, and returns its SHA-256 hash
 */
export const generateSettlementPdf = async (
  data: SettlementPdfData
): Promise<GeneratedPdfResult> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));

      doc.on('end', () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

          const storageDir = path.join(process.cwd(), 'storage', 'settlements');
          if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
          }

          const fileName = `${data.caseNumber}_settlement.pdf`;
          const filePath = path.join(storageDir, fileName);

          fs.writeFileSync(filePath, pdfBuffer);

          resolve({
            pdfPath: filePath,
            settlementHash: hash,
          });
        } catch (err) {
          reject(err);
        }
      });

      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(22).fillColor('#1E293B').text('GHARPAY', { align: 'center' });
      doc.fontSize(14).fillColor('#3B82F6').text('Online Dispute Resolution Settlement', { align: 'center' });
      doc.moveDown(1);
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      // Core Details
      doc.fontSize(12).fillColor('#0F172A');
      doc.text(`Case Number: ${data.caseNumber}`);
      doc.text(`Landlord: ${data.landlordName}`);
      doc.text(`Tenant: ${data.tenantName}`);
      doc.text(`Property: ${data.propertyAddress}`);
      doc.moveDown(0.5);

      // Financial Details
      doc.fontSize(12).fillColor('#1E293B').text('Financial Details:', { underline: true });
      doc.text(`Security Deposit: INR ${data.securityDeposit}`);
      doc.text(`Calculated Deduction: INR ${data.calculatedDeduction}`);
      doc.text(`Agreed Deduction: INR ${data.agreedDeduction}`);
      doc.text(`Refund Amount: INR ${data.refundAmount}`);
      doc.moveDown(0.5);

      // Negotiation Summary
      doc.fontSize(12).fillColor('#1E293B').text('Negotiation Summary:', { underline: true });
      if (data.roundsSummary.length === 0) {
        doc.text('Direct settlement agreed.');
      } else {
        data.roundsSummary.forEach((r) => {
          doc.text(`  Round ${r.roundNumber}:`);
          doc.text(`    Landlord offer: INR ${r.landlordOffer || 'N/A'}`);
          doc.text(`    Tenant offer: INR ${r.tenantOffer || 'N/A'}`);
        });
      }
      doc.moveDown(0.5);

      // Mediator & Consent Information
      doc.fontSize(12).fillColor('#1E293B').text('ODR & Consent Status:', { underline: true });
      doc.text(`Mediator: ${data.mediatorName}`);
      doc.text(`Tenant Consent Recorded: Yes (${data.tenantConsentedAt})`);
      doc.text(`Landlord Consent Recorded: Yes (${data.landlordConsentedAt})`);
      doc.text(`Settlement Status: SETTLED`);
      doc.text(`Generated At: ${new Date().toISOString()}`);
      doc.moveDown(1.5);

      // Legal non-court notice
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);
      doc.fontSize(10).fillColor('#64748B').text(
        'Notice: Settlement recorded through the GharPay Online Dispute Resolution platform.',
        { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
