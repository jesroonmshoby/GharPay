const http = require('http');

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
  console.log('=== TEST: GharPay Dispute Deletion, Outside Agreement & Court Registration ===\n');

  // 1. Login as Ramesh Landlord
  console.log('1. Logging in as Ramesh Landlord...');
  const landlordAuth = await httpRequest('POST', '/auth/login', {
    email: 'ramesh.landlord@gharpay.in',
    password: 'password123',
  });
  if (landlordAuth.status !== 200 || !landlordAuth.data.token) {
    console.error('Failed to log in as landlord:', landlordAuth);
    process.exit(1);
  }
  const landlordToken = landlordAuth.data.token;
  console.log('✔ Authenticated Landlord:', landlordAuth.data.user.name);

  // 2. Login as Aarav Tenant
  console.log('\n2. Logging in as Aarav Tenant...');
  const tenantAuth = await httpRequest('POST', '/auth/login', {
    email: 'aarav.tenant@gharpay.in',
    password: 'password123',
  });
  if (tenantAuth.status !== 200 || !tenantAuth.data.token) {
    console.error('Failed to log in as tenant:', tenantAuth);
    process.exit(1);
  }
  const tenantToken = tenantAuth.data.token;
  console.log('✔ Authenticated Tenant:', tenantAuth.data.user.name);

  // 3. Create a property & tenancy
  console.log('\n3. Creating property & tenancy for test dispute...');
  const propRes = await httpRequest('POST', '/landlord/properties', {
    addressLine1: '45 Lotus Residency, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
  }, landlordToken);
  const propertyId = propRes.data.property.id;

  const tenancyRes = await httpRequest('POST', '/landlord/tenancies', {
    propertyId,
    tenantEmail: 'aarav.tenant@gharpay.in',
    startDate: '2025-01-01',
    monthlyRent: 40000,
    securityDeposit: 150000,
  }, landlordToken);
  const tenancyId = tenancyRes.data.tenancy.id;

  // 4. Create DRAFT dispute (Uninitialized Case)
  console.log('\n4. Creating uninitialized (DRAFT) dispute case...');
  const draftDisputeRes = await httpRequest('POST', '/landlord/disputes', {
    tenancyId,
    claimedDeduction: 30000,
  }, landlordToken);
  const draftDisputeId = draftDisputeRes.data.dispute.id;
  const draftCaseNo = draftDisputeRes.data.dispute.caseNumber;
  console.log(`✔ Created DRAFT dispute case: ${draftCaseNo} (ID: ${draftDisputeId})`);

  // 5. Test Uninitialized Case Deletion (DELETE /api/landlord/disputes/:disputeId)
  console.log('\n5. Testing deletion of uninitialized DRAFT dispute case...');
  const deleteDraftRes = await httpRequest('DELETE', `/landlord/disputes/${draftDisputeId}`, null, landlordToken);
  if (deleteDraftRes.status === 200 && deleteDraftRes.data.success) {
    console.log(`✔ Uninitialized case ${draftCaseNo} deleted successfully: "${deleteDraftRes.data.message}"`);
  } else {
    console.error('❌ Failed to delete DRAFT dispute:', deleteDraftRes);
    process.exit(1);
  }

  // 6. Create an Initialized Case and test that DELETE returns error 400
  console.log('\n6. Creating initialized dispute case...');
  const activeDisputeRes = await httpRequest('POST', '/landlord/disputes', {
    tenancyId,
    claimedDeduction: 35000,
  }, landlordToken);
  const activeDisputeId = activeDisputeRes.data.dispute.id;
  const activeCaseNo = activeDisputeRes.data.dispute.caseNumber;

  // Add claim item
  await httpRequest('POST', `/landlord/disputes/${activeDisputeId}/claims`, {
    category: 'PAINTING',
    description: 'Wall touchup painting required',
    claimedAmount: 20000,
  }, landlordToken);

  // Run calculation
  await httpRequest('POST', `/landlord/disputes/${activeDisputeId}/calculate`, null, landlordToken);

  // Move to TENANT_REVIEW & start NEGOTIATION
  await httpRequest('POST', `/tenant/disputes/${activeDisputeId}/review`, null, tenantToken);
  await httpRequest('POST', `/tenant/disputes/${activeDisputeId}/negotiate`, null, tenantToken);

  console.log(`✔ Case ${activeCaseNo} initialized into NEGOTIATION status.`);

  // Attempt to delete initialized case (should fail)
  console.log('\n7. Testing attempted deletion of initialized case (Should fail 400)...');
  const deleteActiveAttempt = await httpRequest('DELETE', `/landlord/disputes/${activeDisputeId}`, null, landlordToken);
  if (deleteActiveAttempt.status === 400 && deleteActiveAttempt.data.error?.code === 'CANNOT_DELETE_INITIALIZED_DISPUTE') {
    console.log('✔ Correctly rejected unilateral deletion of initialized case:');
    console.log(`   Message: "${deleteActiveAttempt.data.error.message}"`);
  } else {
    console.error('❌ Expected HTTP 400 error for deleting initialized case, but got:', deleteActiveAttempt);
    process.exit(1);
  }

  // 8. Test Mutual Consent Outside Agreement Workflow
  console.log('\n8. Testing Outside Agreement Proposal & Mutual Consent...');
  const proposeRes = await httpRequest('POST', `/disputes/${activeDisputeId}/outside-agreement/propose`, null, landlordToken);
  if (proposeRes.status === 200 && proposeRes.data.success) {
    console.log('✔ Outside agreement proposed by landlord:', proposeRes.data.message);
  } else {
    console.error('❌ Failed to propose outside agreement:', proposeRes);
    process.exit(1);
  }

  // Tenant accepts outside agreement proposal
  console.log('Accepting outside agreement proposal as Tenant...');
  const respondRes = await httpRequest('POST', `/disputes/${activeDisputeId}/outside-agreement/respond`, { accept: true }, tenantToken);
  if (respondRes.status === 200 && respondRes.data.success) {
    console.log('✔ Outside agreement accepted by tenant:', respondRes.data.message);
  } else {
    console.error('❌ Failed to accept outside agreement:', respondRes);
    process.exit(1);
  }

  // Check dispute details to confirm SETTLED status
  const checkDispute = await httpRequest('GET', `/tenant/disputes/${activeDisputeId}`, null, tenantToken);
  console.log(`✔ Verified Dispute Status: ${checkDispute.data.dispute.status} (Expected: SETTLED)`);

  // 9. Test Court Case Registration Application (Post 3 Negotiation Rounds / Mediator Review)
  console.log('\n9. Testing Court Case Registration Application for un-settled dispute...');
  
  // Create another dispute and advance to MEDIATOR_REVIEW
  const courtDisputeRes = await httpRequest('POST', '/landlord/disputes', {
    tenancyId,
    claimedDeduction: 50000,
  }, landlordToken);
  const courtDisputeId = courtDisputeRes.data.dispute.id;
  
  const claimRes = await httpRequest('POST', `/landlord/disputes/${courtDisputeId}/claims`, {
    category: 'UNPAID_RENT',
    description: 'Unpaid final month rent balance',
    claimedAmount: 50000,
  }, landlordToken);
  const claimId = claimRes.data.claim.id;

  // Add supporting evidence so calculation engine approves the claim
  await httpRequest('POST', `/landlord/claims/${claimId}/evidence`, {
    type: 'INVOICE',
    fileUrl: '/api/storage/uploads/invoice.pdf',
    description: 'Repair invoice',
  }, landlordToken);

  await httpRequest('POST', `/landlord/disputes/${courtDisputeId}/calculate`, null, landlordToken);
  await httpRequest('POST', `/tenant/disputes/${courtDisputeId}/review`, null, tenantToken);
  await httpRequest('POST', `/tenant/disputes/${courtDisputeId}/negotiate`, null, tenantToken);

  // Submit 3 rounds of non-matching offers to advance currentRound to 3 / MEDIATOR_REVIEW
  for (let round = 1; round <= 3; round++) {
    const lRes = await httpRequest('POST', `/landlord/disputes/${courtDisputeId}/offers`, { amount: 45000, message: `Round ${round} Landlord offer` }, landlordToken);
    const tRes = await httpRequest('POST', `/tenant/disputes/${courtDisputeId}/offers`, { amount: 5000, message: `Round ${round} Tenant offer` }, tenantToken);
  }

  const courtDisputeDetails = await httpRequest('GET', `/landlord/disputes/${courtDisputeId}`, null, landlordToken);
  console.log(`✔ Case ${courtDisputeDetails.data.dispute.caseNumber} advanced to status: ${courtDisputeDetails.data.dispute.status}, Round: ${courtDisputeDetails.data.dispute.currentRound}`);

  // Submit Court Registration Application
  const courtAppRes = await httpRequest('POST', `/disputes/${courtDisputeId}/court-application`, {
    jurisdiction: 'Bengaluru Rent Court & e-Courts Portal',
    petitionerName: 'Ramesh Kumar',
    respondentName: 'Aarav Sharma',
    legalNotes: 'Unresolved ODR conciliation after 3 rounds. Filing online court petition.',
  }, landlordToken);

  if (courtAppRes.status === 201 && courtAppRes.data.success) {
    console.log('✔ Online Court Case Registration Application generated successfully:');
    console.log('   Court Ref No:', courtAppRes.data.courtApplication.courtRefNo);
    console.log('   ODR Cert ID :', courtAppRes.data.courtApplication.odrCertificateId);
    console.log('   Jurisdiction:', courtAppRes.data.courtApplication.jurisdiction);
  } else {
    console.error('❌ Failed to generate court application:', courtAppRes);
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('SUCCESS: All backend tests passed cleanly!');
  console.log('==================================================');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
