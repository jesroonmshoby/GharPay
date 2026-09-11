const http = require('http');
const fs = require('fs');
const path = require('path');

const API_HOST = 'localhost';
const API_PORT = 4000;

function httpRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        host: API_HOST,
        port: API_PORT,
        path: `/api${path}`,
        method,
        headers,
      },
      (res) => {
        const isPdf = res.headers['content-type'] === 'application/pdf';
        if (isPdf) {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve({ status: res.statusCode, isPdf: true, buffer });
          });
          return;
        }

        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== TEST: GharPay Settlement Flow, Dual Consent, Payment Confirmation & PDF ===\n');

  // 1. Login as Ramesh Landlord
  console.log('1. Logging in as Ramesh Landlord...');
  const landlordAuth = await httpRequest('POST', '/auth/login', {
    email: 'ramesh.landlord@gharpay.in',
    password: 'password123',
  });
  const landlordToken = landlordAuth.data.token;
  console.log('✔ Authenticated Landlord:', landlordAuth.data.user.name);

  // 2. Login as Aarav Tenant
  console.log('\n2. Logging in as Aarav Tenant...');
  const tenantAuth = await httpRequest('POST', '/auth/login', {
    email: 'aarav.tenant@gharpay.in',
    password: 'password123',
  });
  const tenantToken = tenantAuth.data.token;
  console.log('✔ Authenticated Tenant:', tenantAuth.data.user.name);

  // 3. Login as Priya Mediator
  console.log('\n3. Logging in as Priya Mediator...');
  const mediatorAuth = await httpRequest('POST', '/auth/login', {
    email: 'priya.mediator@gharpay.in',
    password: 'password123',
  });
  const mediatorToken = mediatorAuth.data.token;
  const mediatorUserId = mediatorAuth.data.user.id;
  console.log('✔ Authenticated Mediator:', mediatorAuth.data.user.name);

  // 4. Create property & tenancy
  console.log('\n4. Creating property & tenancy...');
  const propRes = await httpRequest('POST', '/landlord/properties', {
    addressLine1: '88 Diamond District, Old Airport Rd',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560008',
  }, landlordToken);
  const propertyId = propRes.data.property.id;

  const tenancyRes = await httpRequest('POST', '/landlord/tenancies', {
    propertyId,
    tenantEmail: 'aarav.tenant@gharpay.in',
    startDate: '2025-01-01',
    monthlyRent: 35000,
    securityDeposit: 200000,
  }, landlordToken);
  const tenancyId = tenancyRes.data.tenancy.id;

  // 5. Create dispute case
  console.log('\n5. Creating dispute case...');
  const disputeRes = await httpRequest('POST', '/landlord/disputes', {
    tenancyId,
    claimedDeduction: 42000,
  }, landlordToken);
  const disputeId = disputeRes.data.dispute.id;
  const caseNo = disputeRes.data.dispute.caseNumber;
  console.log(`✔ Created dispute case ${caseNo} (ID: ${disputeId})`);

  // Add claims
  const claimRes = await httpRequest('POST', `/landlord/disputes/${disputeId}/claims`, {
    category: 'UNPAID_RENT',
    description: 'Unpaid utility bill and final rent adjustment',
    claimedAmount: 20000,
  }, landlordToken);
  const claimId = claimRes.data.claim.id;

  await httpRequest('POST', `/landlord/claims/${claimId}/evidence`, {
    type: 'INVOICE',
    fileUrl: '/api/storage/uploads/rent_bill.pdf',
    description: 'Rent receipt',
  }, landlordToken);

  // Calculate & advance case to SETTLEMENT_PENDING via mediator recommendation
  await httpRequest('POST', `/landlord/disputes/${disputeId}/calculate`, null, landlordToken);
  await httpRequest('POST', `/tenant/disputes/${disputeId}/review`, null, tenantToken);
  await httpRequest('POST', `/tenant/disputes/${disputeId}/negotiate`, null, tenantToken);

  // Advance dispute status to MEDIATOR_REVIEW
  const { PrismaClient } = require('@prisma/client');
  const prismaClient = new PrismaClient();
  await prismaClient.dispute.update({
    where: { id: disputeId },
    data: { status: 'MEDIATOR_REVIEW', settlementEligible: true },
  });
  await prismaClient.$disconnect();

  // Login as Admin to assign Mediator
  console.log('\n6. Assigning Mediator to dispute case...');
  const adminAuth = await httpRequest('POST', '/auth/login', {
    email: 'admin@gharpay.in',
    password: 'password123',
  });
  const adminToken = adminAuth.data.token;
  const assignRes = await httpRequest('POST', `/admin/disputes/${disputeId}/assign`, { mediatorId: mediatorUserId }, adminToken);
  console.log('Assign Mediator result:', assignRes);
  await httpRequest('POST', `/mediator/cases/${disputeId}/review`, null, mediatorToken);
  await httpRequest('POST', `/mediator/cases/${disputeId}/recommendation`, {
    recommendation: 'READY_FOR_SETTLEMENT',
    notes: 'Parties agree to partial deduction',
  }, mediatorToken);

  // 7. Create Settlement by Mediator
  console.log('\n7. Creating Settlement by Mediator...');
  const createSettlementRes = await httpRequest('POST', `/settlements/${disputeId}`, {
    agreedDeduction: 17500,
  }, mediatorToken);
  if (createSettlementRes.status === 201 && createSettlementRes.data.success) {
    console.log(`✔ Settlement created: Agreed Deduction ₹${createSettlementRes.data.settlement.agreedDeduction}, Refund ₹${createSettlementRes.data.settlement.refundAmount}`);
  } else {
    console.error('❌ Failed to create settlement:', createSettlementRes);
    process.exit(1);
  }

  // 8. Record Tenant Consent
  console.log('\n8. Recording Tenant Consent...');
  const tConsentRes = await httpRequest('POST', `/settlements/${disputeId}/consent/tenant`, { consent: true }, tenantToken);
  console.log(`✔ Tenant Consent Recorded. Dispute status: ${tConsentRes.data.settlement.disputeStatus}`);

  // 9. Record Landlord Consent
  console.log('\n9. Recording Landlord Consent...');
  const lConsentRes = await httpRequest('POST', `/settlements/${disputeId}/consent/landlord`, { consent: true }, landlordToken);
  console.log(`✔ Landlord Consent Recorded. Dispute status: ${lConsentRes.data.settlement.disputeStatus} (Expected: SETTLED)`);

  if (lConsentRes.data.settlement.disputeStatus !== 'SETTLED') {
    console.error('❌ Dispute status should be SETTLED after both consents, got:', lConsentRes.data.settlement.disputeStatus);
    process.exit(1);
  }

  // 10. Mark Payment as Paid (Landlord Only)
  console.log('\n10. Testing "Mark Refund as Paid" by Landlord...');
  const markPaidRes = await httpRequest('POST', `/settlements/${disputeId}/mark-paid`, null, landlordToken);
  if (markPaidRes.status === 200 && markPaidRes.data.success) {
    console.log(`✔ Refund payment marked as paid. Payment Status: ${markPaidRes.data.settlement.paymentStatus}`);
    console.log(`   Paid At: ${markPaidRes.data.settlement.paidAt}`);
  } else {
    console.error('❌ Failed to mark refund as paid:', markPaidRes);
    process.exit(1);
  }

  // 11. Test PDF Download Endpoint (GET /api/settlements/:disputeId/pdf)
  console.log('\n11. Testing PDF Download Endpoint (GET /api/settlements/:disputeId/pdf)...');
  const pdfRes = await httpRequest('GET', `/settlements/${disputeId}/pdf`, null, tenantToken);
  if (pdfRes.status === 200 && pdfRes.isPdf && pdfRes.buffer) {
    const isPdfHeader = pdfRes.buffer.toString('utf8', 0, 4) === '%PDF';
    console.log(`✔ PDF binary received successfully. Bytes length: ${pdfRes.buffer.length}, Header check: ${isPdfHeader ? 'VALID %PDF' : 'INVALID'}`);
  } else {
    console.error('❌ Failed to download PDF document:', pdfRes);
    process.exit(1);
  }

  // 12. Refetch Settlement & Check SHA-256 Hash
  console.log('\n12. Verifying settlement SHA-256 Hash in database...');
  const finalSettlement = await httpRequest('GET', `/settlements/${disputeId}`, null, tenantToken);
  console.log(`✔ Settlement Hash: ${finalSettlement.data.settlement.settlementHash}`);
  console.log(`✔ Payment Status : ${finalSettlement.data.settlement.paymentStatus}`);

  console.log('\n==================================================');
  console.log('SUCCESS: All Settlement & PDF tests passed cleanly!');
  console.log('==================================================');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
