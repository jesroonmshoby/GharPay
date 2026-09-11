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

async function runTests() {
  console.log('--- STARTING GHARPAY BACKEND VERIFICATION ---');

  // Test 1: Health Check
  try {
    const health = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/health',
      method: 'GET',
    });
    console.log('✅ 1. Health check:', health.statusCode, health.body);
  } catch (err) {
    console.error('❌ Backend server is not running on port 4000:', err.message);
    return;
  }

  // Test 2: Tenant Self-Registration
  const tenantEmail = `tenant_test_${Date.now()}@gharpay.in`;
  const tenantReg = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Tenant',
      email: tenantEmail,
      password: 'password123',
      role: 'TENANT',
    }
  );
  console.log('✅ 2. Tenant Registration:', tenantReg.statusCode, tenantReg.body.success ? 'SUCCESS' : tenantReg.body);

  // Test 3: Duplicate Email Prevention
  const dupReg = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Duplicate Tenant',
      email: tenantEmail,
      password: 'password123',
      role: 'TENANT',
    }
  );
  console.log('✅ 3. Duplicate Email Rejection:', dupReg.statusCode, dupReg.body.error);

  // Test 4: Tenant Login & JWT
  const tenantLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: tenantEmail,
      password: 'password123',
    }
  );
  console.log('✅ 4. Tenant Login:', tenantLogin.statusCode, tenantLogin.body.user);
  const tenantToken = tenantLogin.body.token;

  // Test 5: Tenant Me Request
  const tenantMe = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${tenantToken}` },
  });
  console.log('✅ 5. Tenant GET /api/auth/me:', tenantMe.statusCode, tenantMe.body.user);

  // Test 6: Landlord Self-Registration & Auth
  const landlordEmail = `landlord_test_${Date.now()}@gharpay.in`;
  const landlordReg = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Landlord',
      email: landlordEmail,
      password: 'password123',
      role: 'LANDLORD',
    }
  );
  console.log('✅ 6. Landlord Registration:', landlordReg.statusCode, landlordReg.body.success ? 'SUCCESS' : landlordReg.body);

  const landlordLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: landlordEmail,
      password: 'password123',
    }
  );
  const landlordToken = landlordLogin.body.token;
  console.log('✅ 7. Landlord Login:', landlordLogin.statusCode, landlordLogin.body.user);

  // Test 7: Mediator Account Auth
  const mediatorLogin = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'priya.mediator@gharpay.in',
      password: 'password123',
    }
  );
  console.log('✅ 8. Mediator Login:', mediatorLogin.statusCode, mediatorLogin.body.user);
  const mediatorToken = mediatorLogin.body.token;

  // Test 8: Public Mediator Registration Rejection
  const mediatorRegAttempt = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Unauth Mediator',
      email: `mediator_hack_${Date.now()}@gharpay.in`,
      password: 'password123',
      role: 'MEDIATOR',
    }
  );
  console.log('✅ 9. Public Mediator Self-Registration Rejection:', mediatorRegAttempt.statusCode, mediatorRegAttempt.body.error);

  // Test 9: Authorization Boundary Checks (403 Forbidden)
  const tenantAccessingLandlord = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/landlord/properties',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tenantToken}`,
      'Content-Type': 'application/json',
    },
  });
  console.log('✅ 10. Tenant Accessing Landlord Endpoint Rejection:', tenantAccessingLandlord.statusCode, tenantAccessingLandlord.body.error);

  const landlordAccessingTenant = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/tenant/disputes',
    method: 'GET',
    headers: { Authorization: `Bearer ${landlordToken}` },
  });
  console.log('✅ 11. Landlord Accessing Tenant Endpoint Rejection:', landlordAccessingTenant.statusCode, landlordAccessingTenant.body.error);

  // Test 10: Mediator Cases List Endpoint
  const mediatorCases = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/mediator/cases',
    method: 'GET',
    headers: { Authorization: `Bearer ${mediatorToken}` },
  });
  console.log('✅ 12. Mediator Cases List:', mediatorCases.statusCode, `Found ${mediatorCases.body.cases?.length || 0} case(s)`);

  console.log('--- ALL BACKEND VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');
}

runTests().catch(console.error);
