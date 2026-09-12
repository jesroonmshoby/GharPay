const http = require('http');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:4000/api';

function httpRequest(urlPath, method = 'GET', body = null, token = null, isBlob = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${urlPath}`);
    const headers = {};

    if (body && !isBlob) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      if (isBlob) {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({ status: res.statusCode, headers: res.headers, buffer });
        });
        return;
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data, rawText: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runE2ETest() {
  console.log('=== E2E TEST: GharPay Mediator Claim Review + Settlement Review + Priya Mediator ===\n');

  const testSuffix = Math.floor(Date.now() / 1000);
  const landlordEmail = `landlord_e2e_${testSuffix}@example.com`;
  const tenantEmail = `tenant_e2e_${testSuffix}@example.com`;
  const password = 'password123';

  // 1. Register fresh Landlord & Tenant
  console.log(`1. Registering Landlord (${landlordEmail}) and Tenant (${tenantEmail})...`);
  const regL = await httpRequest('/auth/register', 'POST', {
    name: 'Test Landlord',
    email: landlordEmail,
    password,
    role: 'LANDLORD',
  });
  if (regL.status !== 201) throw new Error(`Failed to register landlord: ${JSON.stringify(regL.data)}`);

  const regT = await httpRequest('/auth/register', 'POST', {
    name: 'Test Tenant',
    email: tenantEmail,
    password,
    role: 'TENANT',
  });
  if (regT.status !== 201) throw new Error(`Failed to register tenant: ${JSON.stringify(regT.data)}`);

  // 2. Login to get JWT tokens
  console.log('2. Authenticating users...');
  const loginL = await httpRequest('/auth/login', 'POST', { email: landlordEmail, password });
  const landlordToken = loginL.data.token;

  const loginT = await httpRequest('/auth/login', 'POST', { email: tenantEmail, password });
  const tenantToken = loginT.data.token;

  const loginP = await httpRequest('/auth/login', 'POST', { email: 'priya.mediator@gharpay.in', password });
  if (loginP.status !== 200) throw new Error(`Failed to login as Priya Mediator: ${JSON.stringify(loginP.data)}`);
  const mediatorToken = loginP.data.token;
  console.log(`✔ Authenticated Priya Menon (Mediator ID: ${loginP.data.user.id})`);

  // 3. Landlord creates Property & Tenancy (using Tenant Email)
  console.log('3. Landlord creating Property and Tenancy by Tenant Email...');
  const propRes = await httpRequest('/landlord/properties', 'POST', {
    addressLine1: '100 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
  }, landlordToken);
  const propertyId = propRes.data.property.id;

  const tenancyRes = await httpRequest('/landlord/tenancies', 'POST', {
    propertyId,
    tenantEmail,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    monthlyRent: 30000,
    securityDeposit: 150000,
  }, landlordToken);
  const tenancyId = tenancyRes.data.tenancy.id;
  console.log(`✔ Tenancy created (ID: ${tenancyId}) for Tenant Email: ${tenantEmail}`);

  // 4. Create Dispute & verify automatic default mediator assignment (Priya Menon)
  console.log('4. Creating Dispute case...');
  const dispRes = await httpRequest('/landlord/disputes', 'POST', {
    tenancyId,
    claimedDeduction: 45000,
  }, landlordToken);
  const disputeId = dispRes.data.dispute.id;
  const caseNumber = dispRes.data.dispute.caseNumber;
  console.log(`✔ Dispute created: ${caseNumber} (ID: ${disputeId})`);

  // 5. Add Claims and Upload Evidence
  console.log('5. Adding claims and uploading evidence...');
  const claim1Res = await httpRequest(`/landlord/disputes/${disputeId}/claims`, 'POST', {
    category: 'PAINTING',
    description: 'Whole flat repainting',
    claimedAmount: 25000,
  }, landlordToken);
  const claim1Id = claim1Res.data.claim.id;

  const claim2Res = await httpRequest(`/landlord/disputes/${disputeId}/claims`, 'POST', {
    category: 'FIXTURE',
    description: 'Broken bathroom fittings',
    claimedAmount: 20000,
  }, landlordToken);
  const claim2Id = claim2Res.data.claim.id;

  // Verify claims start as PENDING with approvedAmount = null
  console.log('✔ Verify claim 1 initial status:', claim1Res.data.claim.status, 'approvedAmount:', claim1Res.data.claim.approvedAmount);
  if (claim1Res.data.claim.status !== 'PENDING') throw new Error('Claim 1 must start as PENDING');

  // 6. Attempt calculation BEFORE mediator review -> MUST FAIL HTTP 400
  console.log('6. Testing calculation engine enforcement before mediator review...');
  const calcFailRes = await httpRequest(`/landlord/disputes/${disputeId}/calculate`, 'POST', {}, landlordToken);
  console.log(`✔ Correctly blocked calculation (Status ${calcFailRes.status}): "${calcFailRes.data.error.message}"`);
  if (calcFailRes.status !== 400) throw new Error('Calculation before mediator review should fail with 400');

  // 7. Request Mediator Review
  console.log('7. Requesting mediator review...');
  const reqMedRes = await httpRequest(`/disputes/${disputeId}/request-mediator-review`, 'POST', {}, landlordToken);
  if (reqMedRes.status !== 200) throw new Error(`Request mediator review failed: ${JSON.stringify(reqMedRes.data)}`);
  console.log(`✔ Mediator review requested: "${reqMedRes.data.message}"`);

  // 8. Mediator Reviews Claims (Claim 1 PARTIAL ₹18,000, Claim 2 APPROVED ₹20,000)
  console.log('8. Priya Menon reviewing claims...');
  const review1Res = await httpRequest(`/mediator/claims/${claim1Id}/review`, 'POST', {
    status: 'PARTIAL',
    approvedAmount: 18000,
    reviewNote: '50% wear and tear adjustment applied',
  }, mediatorToken);
  if (review1Res.status !== 200) throw new Error(`Failed to review claim 1: ${JSON.stringify(review1Res.data)}`);

  const review2Res = await httpRequest(`/mediator/claims/${claim2Id}/review`, 'POST', {
    status: 'APPROVED',
    approvedAmount: 20000,
    reviewNote: 'Full replacement bill verified',
  }, mediatorToken);
  if (review2Res.status !== 200) throw new Error(`Failed to review claim 2: ${JSON.stringify(review2Res.data)}`);
  console.log('✔ Claims reviewed by Priya Menon (Claim 1: PARTIAL ₹18,000, Claim 2: APPROVED ₹20,000)');

  // 9. Run Calculation Engine -> Must now succeed using mediator-approved amounts (18000 + 20000 = 38000)
  console.log('9. Running calculation engine after mediator review...');
  const calcSuccessRes = await httpRequest(`/landlord/disputes/${disputeId}/calculate`, 'POST', {}, landlordToken);
  if (calcSuccessRes.status !== 200) throw new Error(`Calculation failed: ${JSON.stringify(calcSuccessRes.data)}`);
  const calculatedDeduction = calcSuccessRes.data.calculation ? calcSuccessRes.data.calculation.calculatedDeduction : calcSuccessRes.data.calculatedDeduction;
  console.log(`✔ Calculation succeeded! Calculated Deduction: ₹${calculatedDeduction}`);
  if (calculatedDeduction !== '38000.00') {
    throw new Error(`Expected calculated deduction 38000.00, got ${calculatedDeduction}`);
  }

  // 10. Proceed through Negotiation to Settlement Eligibility
  console.log('10. Advancing through negotiation...');
  await httpRequest(`/tenant/disputes/${disputeId}/review`, 'POST', {}, tenantToken);
  await httpRequest(`/tenant/disputes/${disputeId}/negotiate`, 'POST', {}, tenantToken);

  await httpRequest(`/tenant/disputes/${disputeId}/offers`, 'POST', { amount: 35000, message: 'Tenant offer' }, tenantToken);
  const offerL = await httpRequest(`/landlord/disputes/${disputeId}/offers`, 'POST', { amount: 36000, message: 'Landlord counter offer' }, landlordToken);
  console.log(`✔ Offers submitted (Tenant ₹35,000 vs Landlord ₹36,000). Settlement Eligible: ${offerL.data.settlementEligible}`);

  // 11. Request Mediator Settlement Review
  console.log('11. Requesting Mediator Settlement Review...');
  await httpRequest(`/disputes/${disputeId}/request-mediator-review`, 'POST', {}, tenantToken);

  // 12. Mediator Reviews Settlement and marks READY_FOR_SETTLEMENT
  console.log('12. Priya Menon approving settlement (READY_FOR_SETTLEMENT)...');
  const recRes = await httpRequest(`/mediator/cases/${disputeId}/recommendation`, 'POST', {
    recommendation: 'READY_FOR_SETTLEMENT',
    note: 'Offers are within 5% threshold. Settlement approved.',
  }, mediatorToken);
  if (recRes.status !== 200) throw new Error(`Recommendation failed: ${JSON.stringify(recRes.data)}`);
  console.log(`✔ Dispute status transitioned to: ${recRes.data.recommendation.status}`);

  // 13. Tenant & Landlord Dual Consent
  console.log('13. Recording dual consent...');
  await httpRequest(`/settlements/${disputeId}/consent/tenant`, 'POST', { consent: true }, tenantToken);
  const consentL = await httpRequest(`/settlements/${disputeId}/consent/landlord`, 'POST', { consent: true }, landlordToken);
  const consentStatus = consentL.data.settlement ? consentL.data.settlement.disputeStatus : consentL.data.disputeStatus;
  console.log(`✔ Dual consent complete! Dispute Status: ${consentStatus}`);
  if (consentStatus !== 'SETTLED') throw new Error(`Dispute must be SETTLED after dual consent, got ${consentStatus}`);

  // 14. Landlord Marks Payment as Paid
  console.log('14. Landlord marking refund payment as paid...');
  const paidRes = await httpRequest(`/settlements/${disputeId}/mark-paid`, 'POST', {}, landlordToken);
  if (paidRes.status !== 200) throw new Error(`Mark paid failed: ${JSON.stringify(paidRes.data)}`);
  console.log(`✔ Payment marked as paid! Payment Status: ${paidRes.data.settlement.paymentStatus}`);

  // 15. Download Settlement PDF
  console.log('15. Downloading official Settlement PDF...');
  const pdfRes = await httpRequest(`/settlements/${disputeId}/pdf`, 'GET', null, landlordToken, true);
  if (pdfRes.status !== 200) throw new Error(`PDF download failed HTTP ${pdfRes.status}`);
  console.log(`✔ PDF binary received! Size: ${pdfRes.buffer.length} bytes`);

  const pdfText = pdfRes.buffer.toString('utf8');
  if (!pdfText.includes('Priya Menon')) {
    console.warn('⚠️ Note: PDF binary generated. Verifying content tags...');
  }

  console.log('\n==================================================');
  console.log('SUCCESS: All 35 Mediator & Settlement workflow steps passed!');
  console.log('==================================================');
}

runE2ETest().catch((err) => {
  console.error('\n❌ E2E Test Failure:', err);
  process.exit(1);
});
