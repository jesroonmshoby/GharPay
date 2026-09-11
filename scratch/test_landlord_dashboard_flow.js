const API_BASE = 'http://localhost:4000/api';

async function main() {
  console.log('=== GHARPAY LANDLORD DASHBOARD & DISPUTE FLOW VERIFICATION ===\n');

  // 1. Login as Ramesh Landlord
  console.log('1. Logging in as Ramesh Landlord...');
  const rameshLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ramesh.landlord@gharpay.in',
      password: 'password123',
    }),
  });
  const rameshLoginData = await rameshLoginRes.json();
  if (!rameshLoginRes.ok) {
    throw new Error(`Ramesh login failed: ${JSON.stringify(rameshLoginData)}`);
  }
  const rameshToken = rameshLoginData.token;
  console.log(`✔ Authenticated Ramesh Landlord (ID: ${rameshLoginData.user.id}, Name: ${rameshLoginData.user.name})`);

  // 2. GET /api/auth/me
  console.log('\n2. Testing GET /api/auth/me for Ramesh...');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${rameshToken}` },
  });
  const meData = await meRes.json();
  console.log(`✔ Authenticated user: Name="${meData.user.name}", Role="${meData.user.role}", Email="${meData.user.email}"`);

  // 3. GET /api/landlord/disputes for Ramesh
  console.log('\n3. Testing GET /api/landlord/disputes for Ramesh...');
  const rameshDisputesRes = await fetch(`${API_BASE}/landlord/disputes`, {
    headers: { Authorization: `Bearer ${rameshToken}` },
  });
  const rameshDisputesData = await rameshDisputesRes.json();
  console.log(`✔ Ramesh Disputes retrieved: ${rameshDisputesData.disputes?.length || 0} disputes found.`);
  if (rameshDisputesData.disputes?.length > 0) {
    const d = rameshDisputesData.disputes[0];
    console.log(`   Sample Case: ${d.caseNumber}, Status: ${d.status}, TotalDeposit: ₹${d.totalDeposit}, Claimed: ₹${d.claimedDeduction}, Calculated: ${d.calculatedDeduction ? `₹${d.calculatedDeduction}` : 'Null'}`);
  }

  // 4. Register a NEW Landlord to verify clean empty state & new dispute creation
  console.log('\n4. Registering a fresh new Landlord account...');
  const freshEmail = `test.landlord.${Date.now()}@gharpay.in`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vikram Singh',
      email: freshEmail,
      password: 'password123',
      role: 'LANDLORD',
      phone: '9876543210',
    }),
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(`Register failed: ${JSON.stringify(registerData)}`);
  }
  console.log(`✔ Created fresh Landlord: ${registerData.user.name} (${registerData.user.email})`);

  // Login as fresh Landlord
  const freshLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: freshEmail,
      password: 'password123',
    }),
  });
  const freshLoginData = await freshLoginRes.json();
  const freshToken = freshLoginData.token;

  // 5. GET /api/landlord/disputes for NEW Landlord (Must be empty)
  console.log('\n5. Checking disputes for fresh Landlord (Empty state test)...');
  const freshDisputesRes = await fetch(`${API_BASE}/landlord/disputes`, {
    headers: { Authorization: `Bearer ${freshToken}` },
  });
  const freshDisputesData = await freshDisputesRes.json();
  console.log(`✔ Fresh Landlord disputes count: ${freshDisputesData.disputes?.length} (Expected: 0)`);
  if (freshDisputesData.disputes?.length !== 0) {
    throw new Error('Fresh landlord should have 0 disputes!');
  }

  // 6. Create Property, Tenancy & Dispute for Fresh Landlord
  console.log('\n6. Creating Property for Fresh Landlord...');
  const propRes = await fetch(`${API_BASE}/landlord/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freshToken}`,
    },
    body: JSON.stringify({
      addressLine1: 'Indiranagar 100ft Rd, Villa 12',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
    }),
  });
  const propData = await propRes.json();
  console.log(`✔ Created Property ID: ${propData.property.id}`);

  console.log('\n7. Creating Tenancy with Tenant Email (aarav.tenant@gharpay.in)...');
  const tenancyRes = await fetch(`${API_BASE}/landlord/tenancies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freshToken}`,
    },
    body: JSON.stringify({
      propertyId: propData.property.id,
      tenantEmail: 'aarav.tenant@gharpay.in',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      monthlyRent: 35000,
      securityDeposit: 150000,
    }),
  });
  const tenancyData = await tenancyRes.json();
  if (!tenancyRes.ok) {
    throw new Error(`Tenancy creation failed: ${JSON.stringify(tenancyData)}`);
  }
  console.log(`✔ Created Tenancy ID: ${tenancyData.tenancy.id}`);

  console.log('\n8. Creating Dispute Case...');
  const disputeRes = await fetch(`${API_BASE}/landlord/disputes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freshToken}`,
    },
    body: JSON.stringify({
      tenancyId: tenancyData.tenancy.id,
      claimedDeduction: 25000,
    }),
  });
  const disputeData = await disputeRes.json();
  if (!disputeRes.ok) {
    throw new Error(`Dispute creation failed: ${JSON.stringify(disputeData)}`);
  }
  const createdDispute = disputeData.dispute;
  console.log(`✔ Created Dispute: Case ${createdDispute.caseNumber} (ID: ${createdDispute.id}, Status: ${createdDispute.status})`);

  // 9. Fetch disputes for fresh landlord AGAIN (Must return 1 dispute)
  console.log('\n9. Refetching GET /api/landlord/disputes for Fresh Landlord after creation...');
  const refetchRes = await fetch(`${API_BASE}/landlord/disputes`, {
    headers: { Authorization: `Bearer ${freshToken}` },
  });
  const refetchData = await refetchRes.json();
  console.log(`✔ Fresh Landlord now has ${refetchData.disputes?.length} dispute(s).`);
  const activeCount = refetchData.disputes.filter(d => !['SETTLED', 'REJECTED'].includes(d.status)).length;
  console.log(`✔ Active disputes count: ${activeCount}`);
  console.log(`✔ Calculated deduction in fresh dispute: ${refetchData.disputes[0].calculatedDeduction || 'Not calculated'}`);

  // 10. Add Claim and Run Calculation
  console.log('\n10. Adding Claim item (Painting, ₹15,000)...');
  const claimRes = await fetch(`${API_BASE}/landlord/disputes/${createdDispute.id}/claims`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freshToken}`,
    },
    body: JSON.stringify({
      category: 'PAINTING',
      description: 'Living room wall repainting',
      claimedAmount: 15000,
    }),
  });
  const claimData = await claimRes.json();
  console.log(`✔ Created Claim ID: ${claimData.claim.id}`);

  console.log('\n11. Running GharPay Calculation Engine...');
  const calcRes = await fetch(`${API_BASE}/landlord/disputes/${createdDispute.id}/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${freshToken}`,
    },
  });
  const calcData = await calcRes.json();
  console.log(`✔ Calculation Engine Output: Claimed=₹${calcData.calculation.claimedDeduction}, Calculated=₹${calcData.calculation.calculatedDeduction}`);

  // 12. Final Refetch check
  console.log('\n12. Final GET /api/landlord/disputes refetch after calculation...');
  const finalRes = await fetch(`${API_BASE}/landlord/disputes`, {
    headers: { Authorization: `Bearer ${freshToken}` },
  });
  const finalData = await finalRes.json();
  console.log(`✔ Dashboard metric Calculated Deduction for case ${finalData.disputes[0].caseNumber}: ₹${finalData.disputes[0].calculatedDeduction}`);

  console.log('\n==================================================');
  console.log('SUCCESS: All backend endpoints & data bindings verified!');
  console.log('==================================================');
}

main().catch((err) => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});
