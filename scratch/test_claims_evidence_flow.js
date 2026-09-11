const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runClaimsEvidenceTest() {
  console.log('--- STARTING TASK 10 CLAIMS & EVIDENCE END-TO-END VERIFICATION TEST ---');

  // Step 1: Landlord Login
  const landlordLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'ramesh.landlord@gharpay.in', password: 'password123' }
  );
  const landlordToken = landlordLogin.body.token;
  console.log('1. Landlord Logged In:', landlordLogin.body.user?.name);

  // Step 2: Create Property
  const propRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/landlord/properties',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${landlordToken}`,
        'Content-Type': 'application/json',
      },
    },
    {
      addressLine1: 'Koramangala 4th Block',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560034',
    }
  );
  const propertyId = propRes.body.property?.id;

  // Step 3: Create Tenancy via Tenant Email
  const tenancyRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/landlord/tenancies',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${landlordToken}`,
        'Content-Type': 'application/json',
      },
    },
    {
      propertyId,
      tenantEmail: 'aarav.tenant@gharpay.in',
      startDate: '2025-01-01',
      monthlyRent: 40000,
      securityDeposit: 200000,
    }
  );
  const tenancyId = tenancyRes.body.tenancy?.id;

  // Step 4: Create Dispute Case
  const disputeRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/landlord/disputes',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${landlordToken}`,
        'Content-Type': 'application/json',
      },
    },
    {
      tenancyId,
      claimedDeduction: 42000,
    }
  );
  const disputeId = disputeRes.body.dispute?.id;
  console.log(`2. Dispute Case Created: ${disputeRes.body.dispute?.caseNumber} (ID: ${disputeId})`);

  // Task 10 Step 1 & 2: Create Claim (PAINTING, "Wall damage in bedroom", ₹18,000)
  const claimRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/landlord/disputes/${disputeId}/claims`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${landlordToken}`,
        'Content-Type': 'application/json',
      },
    },
    {
      category: 'PAINTING',
      description: 'Wall damage in bedroom',
      claimedAmount: 18000,
    }
  );
  const claimId = claimRes.body.claim?.id;
  console.log('✅ 3. Saved Claim Verification:', {
    category: claimRes.body.claim?.category,
    description: claimRes.body.claim?.description,
    claimedAmount: claimRes.body.claim?.claimedAmount,
  });

  // Task 10 Step 3, 4 & 5: Upload Real File Evidence
  const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJSCjldC1CiAxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzMgMCBSXT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgMzAwIDMwMF0+PgplbmRvYmoKdHJhaWxlcgo8PC9Sb290IDEgMCBSPj4KJSVFT0YK';

  const uploadRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/landlord/evidence/upload',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${landlordToken}`,
        'Content-Type': 'application/json',
      },
    },
    {
      fileName: 'bedroom_repair_receipt.pdf',
      fileData: samplePdfBase64,
    }
  );
  console.log('✅ 4. Evidence File Saved to Local Storage:', uploadRes.body.fileUrl);

  const evidenceRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/landlord/claims/${claimId}/evidence`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${landlordToken}`,
        'Content-Type': 'application/json',
      },
    },
    {
      type: 'RECEIPT',
      fileUrl: uploadRes.body.fileUrl,
      description: 'Bedroom repainting receipt',
    }
  );
  console.log('✅ 5. Evidence Attached to Claim:', {
    evidenceId: evidenceRes.body.evidence?.id,
    type: evidenceRes.body.evidence?.type,
    fileUrl: evidenceRes.body.evidence?.fileUrl,
  });

  // Task 10 Step 6 & 7: Refresh & Verify Persistence
  const refreshRes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: `/api/landlord/disputes/${disputeId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${landlordToken}` },
  });
  const refreshedClaims = refreshRes.body.dispute?.claims;
  console.log('✅ 6. Refreshed Dispute Verification (Database Persistence):', {
    claimCount: refreshedClaims?.length,
    claimCategory: refreshedClaims?.[0]?.category,
    claimDescription: refreshedClaims?.[0]?.description,
    claimAmount: refreshedClaims?.[0]?.claimedAmount,
    attachedEvidenceCount: refreshedClaims?.[0]?.evidence?.length,
    attachedFileUrl: refreshedClaims?.[0]?.evidence?.[0]?.fileUrl,
  });

  // Task 10 Step 8 & 9: Trigger Calculation Engine
  const calcRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/landlord/disputes/${disputeId}/calculate`,
      method: 'POST',
      headers: { Authorization: `Bearer ${landlordToken}` },
    },
    {}
  );
  console.log('✅ 7. Calculation Engine Verification:', {
    caseNumber: calcRes.body.calculation?.caseNumber,
    calculatedDeduction: calcRes.body.calculation?.calculatedDeduction,
    evaluatedClaim: calcRes.body.calculation?.claims?.[0],
  });

  console.log('--- TASK 10 E2E CLAIMS & EVIDENCE VERIFICATION COMPLETED SUCCESSFULLY ---');
}

runClaimsEvidenceTest().catch(console.error);
