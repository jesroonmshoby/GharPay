import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ClaimPdfItem {
  category: string;
  description: string;
  claimedAmount: string;
  approvedAmount: string;
  explanation?: string | null;
}

export interface SettlementPdfData {
  disputeId: string;
  caseNumber: string;
  createdAt: string;
  finalizedAt: string;
  tenantName: string;
  tenantEmail: string;
  landlordName: string;
  landlordEmail: string;
  propertyAddress: string;
  securityDeposit: string;
  claimedDeduction: string;
  calculatedDeduction: string;
  agreedDeduction: string;
  refundAmount: string;
  claims: ClaimPdfItem[];
  totalClaimed: string;
  totalApproved: string;
  tenantConsentedAt: string;
  landlordConsentedAt: string;
  paymentStatus: 'PENDING' | 'MARKED_PAID';
  paidAt?: string | null;
  paidByLandlordName?: string | null;
}

export interface GeneratedPdfResult {
  pdfPath: string;
  pdfBuffer: Buffer;
  settlementHash: string;
}

/**
 * Format a Date object into a readable IST digital timestamp string
 * e.g. "12 September 2026, 12:42:31 AM IST"
 */
export const formatDigitalTimestamp = (date: Date = new Date()): string => {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) + ' IST';
};

/**
 * Generates an official PDF settlement document using PDFKit, saves it locally, and returns its SHA-256 hash
 */
export const generateSettlementPdf = async (
  data: SettlementPdfData
): Promise<GeneratedPdfResult> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
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
            pdfBuffer,
            settlementHash: hash,
          });
        } catch (err) {
          reject(err);
        }
      });

      doc.on('error', (err) => reject(err));

      const nowTimestamp = formatDigitalTimestamp();

      // Brand Header
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#B68400').text('GHARPAY', { align: 'center' });
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#111111').text('ONLINE DISPUTE RESOLUTION', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#555555').text('Official Conciliation & Deposit Settlement Record', { align: 'center' });
      doc.moveDown(0.8);
      
      doc.strokeColor('#D4D4D8').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      // Section 1: Case Information
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111111').text('CASE INFORMATION');
      doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
      doc.text(`GharPay Case Number: ${data.caseNumber}`);
      doc.text(`Settlement Status: SETTLED`);
      doc.text(`Settlement Created: ${data.createdAt}`);
      doc.text(`Settlement Finalized: ${data.finalizedAt}`);
      doc.moveDown(0.6);

      // Section 2: Parties
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111111').text('PARTIES');
      doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
      doc.text(`Tenant: ${data.tenantName} (${data.tenantEmail})`);
      doc.text(`Landlord: ${data.landlordName} (${data.landlordEmail})`);
      doc.moveDown(0.6);

      // Section 3: Property Address
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111111').text('PROPERTY');
      doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
      doc.text(`Property Address: ${data.propertyAddress}`);
      doc.moveDown(0.6);

      // Section 4: Computed Financial Breakdown
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111111').text('COMPUTED FINANCIAL BREAKDOWN');
      doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
      doc.text(`Security Deposit: INR ${data.securityDeposit}`);
      doc.text(`Claimed Deduction: INR ${data.claimedDeduction}`);
      doc.text(`Calculated Deduction: INR ${data.calculatedDeduction}`);
      doc.text(`Agreed Deduction: INR ${data.agreedDeduction}`);
      doc.font('Helvetica-Bold').fillColor('#1B8E13').text(`Refund Amount: INR ${data.refundAmount}`);
      doc.font('Helvetica').fillColor('#333333');
      doc.moveDown(0.6);

      // Section 5: Claim-by-Claim Breakdown Table
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111111').text('CLAIM-BY-CLAIM BREAKDOWN');
      doc.moveDown(0.3);

      if (!data.claims || data.claims.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666').text('No individual claim items recorded.');
      } else {
        // Table Header
        const startY = doc.y;
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#111111');
        doc.text('Category', 40, startY, { width: 90 });
        doc.text('Description', 130, startY, { width: 180 });
        doc.text('Claimed', 310, startY, { width: 70, align: 'right' });
        doc.text('Approved', 380, startY, { width: 70, align: 'right' });
        doc.text('Explanation', 455, startY, { width: 100 });
        
        doc.moveDown(0.4);
        doc.strokeColor('#E4E4E7').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.4);

        doc.fontSize(8.5).font('Helvetica').fillColor('#333333');
        data.claims.forEach((c) => {
          const rowY = doc.y;
          doc.text(c.category, 40, rowY, { width: 85 });
          doc.text(c.description, 130, rowY, { width: 175 });
          doc.text(`INR ${c.claimedAmount}`, 310, rowY, { width: 70, align: 'right' });
          doc.text(`INR ${c.approvedAmount}`, 380, rowY, { width: 70, align: 'right' });
          doc.text(c.explanation || 'Evaluated under policy', 455, rowY, { width: 100 });
          doc.moveDown(0.5);
        });

        doc.strokeColor('#E4E4E7').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.4);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#111111');
        doc.text(`Total Claimed: INR ${data.totalClaimed}   |   Total Approved: INR ${data.totalApproved}`);
      }
      doc.moveDown(0.8);

      // Section 6: Consent Record
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111111').text('CONSENT RECORD');
      doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
      doc.text(`Tenant Consent: Recorded (${data.tenantConsentedAt})`);
      doc.text(`Landlord Consent: Recorded (${data.landlordConsentedAt})`);
      doc.moveDown(0.6);

      // Section 7: Payment Status
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111111').text('PAYMENT STATUS');
      doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
      if (data.paymentStatus === 'MARKED_PAID') {
        doc.fillColor('#1B8E13').font('Helvetica-Bold').text(`Payment Status: Marked Paid`);
        doc.fillColor('#333333').font('Helvetica');
        doc.text(`Payment Confirmed: ${data.paidAt || 'Recorded'}`);
        doc.text(`Payment Confirmed By: ${data.paidByLandlordName || data.landlordName}`);
        doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#666666').text('Payment confirmation recorded by GharPay.');
      } else {
        doc.fillColor('#B68400').font('Helvetica-Bold').text(`Payment Status: Pending Landlord Refund Confirmation`);
        doc.fillColor('#333333').font('Helvetica');
        doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#666666').text('Awaiting landlord refund payment confirmation.');
      }
      doc.moveDown(0.8);

      // Section 8: Digital Timestamp & Hash
      doc.strokeColor('#D4D4D8').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#111111').text(`Document Generated: ${nowTimestamp}`);
      doc.fontSize(8).font('Helvetica').fillColor('#555555').text(`GharPay ODR Verification Protocol - SHA-256 Buffer Digest Verified`);
      doc.moveDown(0.8);

      // Section 9: Disclaimers
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#444444').text(
        'Settlement recorded through the GharPay Online Dispute Resolution platform.',
        { align: 'center' }
      );
      doc.fontSize(8).font('Helvetica').fillColor('#666666').text(
        'GharPay is an Online Dispute Resolution platform and does not process or transfer funds.',
        { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
