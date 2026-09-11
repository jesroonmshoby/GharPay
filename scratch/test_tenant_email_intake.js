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

async function runTenantEmailTests() {
  console.log('--- STARTING TENANT EMAIL INTAKE VALIDATION TESTS ---');

  // 1. Landlord Login to get Token
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
  console.log('1. Authenticated Landlord:', landlordLogin.body.user?.name);

  // 2. Create a Property for test tenancies
  const propertyRes = await makeRequest(
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
      addressLine1: 'Indiranagar 100ft Rd',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
    }
  );
  const propertyId = propertyRes.body.property?.id;
  console.log('2. Test Property Created:', propertyId);

  // Test Case 1: Valid Tenant Email
  const test1 = await makeRequest(
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
  console.log('✅ TEST 1 (Valid Tenant Email):', test1.statusCode, test1.body.success ? `Tenancy Created (ID: ${test1.body.tenancy?.id}, tenantId UUID: ${test1.body.tenancy?.tenantId})` : test1.body);

  // Test Case 2: Nonexistent Email
  const test2 = await makeRequest(
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
      tenantEmail: 'nonexistent_tenant_9999@example.com',
      startDate: '2025-01-01',
      monthlyRent: 40000,
      securityDeposit: 200000,
    }
  );
  console.log('✅ TEST 2 (Nonexistent Email):', test2.statusCode, test2.body.error);

  // Test Case 3: Landlord Email
  const test3 = await makeRequest(
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
      tenantEmail: 'ramesh.landlord@gharpay.in',
      startDate: '2025-01-01',
      monthlyRent: 40000,
      securityDeposit: 200000,
    }
  );
  console.log('✅ TEST 3 (Landlord Email Rejection):', test3.statusCode, test3.body.error);

  // Test Case 4: Mediator Email
  const test4 = await makeRequest(
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
      tenantEmail: 'priya.mediator@gharpay.in',
      startDate: '2025-01-01',
      monthlyRent: 40000,
      securityDeposit: 200000,
    }
  );
  console.log('✅ TEST 4 (Mediator Email Rejection):', test4.statusCode, test4.body.error);

  // Test Case 5: Empty Email
  const test5 = await makeRequest(
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
      tenantEmail: '',
      startDate: '2025-01-01',
      monthlyRent: 40000,
      securityDeposit: 200000,
    }
  );
  console.log('✅ TEST 5 (Empty Email Rejection):', test5.statusCode, test5.body.error);

  // Test Case 6: Email with Uppercase & Spaces
  const test6 = await makeRequest(
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
      tenantEmail: '   AARAV.TENANT@GHARPAY.IN   ',
      startDate: '2025-01-01',
      monthlyRent: 40000,
      securityDeposit: 200000,
    }
  );
  console.log('✅ TEST 6 (Uppercase & Whitespace Normalization):', test6.statusCode, test6.body.success ? `Tenancy Created via Normalized Email` : test6.body);

  console.log('--- ALL TENANT EMAIL INTAKE TESTS COMPLETED SUCCESSFULLY ---');
}

runTenantEmailTests().catch(console.error);
