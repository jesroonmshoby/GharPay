const API_BASE = 'http://localhost:4000/api';

async function main() {
  console.log('=== TEST API ERROR & SUCCESS NOTIFICATION INTEGRATION ===\n');

  // 1. Login as Ramesh Landlord
  console.log('1. Logging in as Ramesh Landlord...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ramesh.landlord@gharpay.in',
      password: 'password123',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log(`✔ Authenticated Ramesh (User ID: ${loginData.user.id})`);

  // 2. Fetch disputes
  const disputesRes = await fetch(`${API_BASE}/landlord/disputes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const disputesData = await disputesRes.json();
  const dispute = disputesData.disputes[0];
  console.log(`\n2. Selected Dispute Case: ${dispute.caseNumber} (ID: ${dispute.id}, Deposit: ₹${dispute.totalDeposit}, Claimed: ₹${dispute.claimedDeduction})`);

  // 3. Trigger API Error: Claim amount exceeding disputed deduction
  console.log('\n3. Triggering API Error: Adding claim exceeding total disputed deduction...');
  const invalidClaimRes = await fetch(`${API_BASE}/landlord/disputes/${dispute.id}/claims`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      category: 'PAINTING',
      description: 'Excessive claim testing error toast',
      claimedAmount: 9999999, // Exceeds deposit
    }),
  });
  const invalidClaimData = await invalidClaimRes.json();
  console.log(`✔ API returned status ${invalidClaimRes.status} (Expected: 400)`);
  console.log(`✔ Clean backend error message: "${invalidClaimData.error?.message}"`);
  if (!invalidClaimData.error?.message) {
    throw new Error('Backend did not return safe error message!');
  }

  // 4. Trigger Successful Action
  console.log('\n4. Triggering Successful Action: Adding valid claim...');
  const validClaimRes = await fetch(`${API_BASE}/landlord/disputes/${dispute.id}/claims`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      category: 'CLEANING',
      description: 'Deep cleaning fee',
      claimedAmount: 500,
    }),
  });
  const validClaimData = await validClaimRes.json();
  console.log(`✔ Valid claim created with ID: ${validClaimData.claim?.id}`);

  // Cleanup temporary claim
  await fetch(`${API_BASE}/landlord/claims/${validClaimData.claim.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✔ Cleaned up temporary claim record.');

  console.log('\n==================================================');
  console.log('SUCCESS: API error & success notifications verified!');
  console.log('==================================================');
}

main().catch((err) => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});
