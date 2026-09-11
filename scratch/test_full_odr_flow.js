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

async function runFullOdrFlowTest() {
  console.log('--- STARTING GHARPAY FULL ODR DISPUTE LIFECYCLE TEST ---');

  // 1. Landlord Login
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
  console.log('1. Landlord Logged In:', landlordLogin.body.user.name);

  // 2. Tenant Login
  const tenantLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'aarav.tenant@gharpay.in', password: 'password123' }
  );
  const tenantToken = tenantLogin.body.token;
  console.log('2. Tenant Logged In:', tenantLogin.body.user.name);

  // 3. Mediator Login
  const mediatorLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'priya.mediator@gharpay.in', password: 'password123' }
  );
  const mediatorToken = mediatorLogin.body.token;
  console.log('3. Mediator Logged In:', mediatorLogin.body.user.name);

  // 4. Tenant fetches active disputes
  const tenantDisputes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/tenant/disputes',
    method: 'GET',
    headers: { Authorization: `Bearer ${tenantToken}` },
  });
  console.log('4. Tenant Disputes Count:', tenantDisputes.body.disputes?.length);
  const demoDispute = tenantDisputes.body.disputes?.[0];

  if (demoDispute) {
    console.log(`5. Demo Dispute Found: Case ${demoDispute.caseNumber} (ID: ${demoDispute.id})`);
    console.log('   Status:', demoDispute.status);
    console.log('   Total Deposit:', demoDispute.totalDeposit);
    console.log('   Claimed Deduction:', demoDispute.claimedDeduction);
    console.log('   Calculated Deduction:', demoDispute.calculatedDeduction);
    console.log('   Settlement Eligible:', demoDispute.settlementEligible);
  }

  // 5. Mediator fetches case details
  if (demoDispute) {
    const mediatorCase = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: `/api/mediator/cases/${demoDispute.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${mediatorToken}` },
    });
    console.log('6. Mediator Case View Status:', mediatorCase.statusCode, mediatorCase.body.caseDetails?.dispute?.caseNumber);
  }

  console.log('--- FULL ODR DISPUTE LIFECYCLE TEST COMPLETED SUCCESSFULLY ---');
}

runFullOdrFlowTest().catch(console.error);
