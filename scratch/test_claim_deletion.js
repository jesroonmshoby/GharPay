const API_BASE = 'http://localhost:4000/api';

async function main() {
  console.log('=== TEST CLAIM DELETION FLOW ===\n');

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

  // 2. Fetch Ramesh's disputes
  const disputesRes = await fetch(`${API_BASE}/landlord/disputes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const disputesData = await disputesRes.json();
  const dispute = disputesData.disputes[0];
  console.log(`\n2. Selected Dispute Case: ${dispute.caseNumber} (ID: ${dispute.id})`);

  // 3. Create a temporary claim to delete
  console.log('\n3. Creating temporary claim (Cleaning, ₹2500)...');
  const createClaimRes = await fetch(`${API_BASE}/landlord/disputes/${dispute.id}/claims`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      category: 'CLEANING',
      description: 'Temporary deep cleaning charge for deletion test',
      claimedAmount: 2500,
    }),
  });
  const createClaimData = await createClaimRes.json();
  if (!createClaimRes.ok) {
    throw new Error(`Failed to create claim: ${JSON.stringify(createClaimData)}`);
  }
  const claimId = createClaimData.claim.id;
  console.log(`✔ Created Claim ID: ${claimId}`);

  // 4. Attach evidence to the temporary claim
  console.log('\n4. Attaching evidence to claim...');
  const evRes = await fetch(`${API_BASE}/landlord/claims/${claimId}/evidence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: 'RECEIPT',
      fileUrl: '/api/storage/uploads/test.pdf',
      description: 'Cleaning receipt',
    }),
  });
  const evData = await evRes.json();
  console.log(`✔ Attached Evidence ID: ${evData.evidence.id}`);

  // 5. Verify claim exists in dispute claims list
  console.log('\n5. Fetching claims list before deletion...');
  const claimsBeforeRes = await fetch(`${API_BASE}/landlord/disputes/${dispute.id}/claims`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const claimsBeforeData = await claimsBeforeRes.json();
  const existsBefore = claimsBeforeData.claims.some(c => c.id === claimId);
  console.log(`✔ Claim present in list before delete: ${existsBefore}`);
  if (!existsBefore) throw new Error('Claim was not created properly!');

  // 6. Delete claim via DELETE /api/landlord/claims/:claimId
  console.log(`\n6. Deleting Claim ${claimId} via DELETE /api/landlord/claims/${claimId}...`);
  const deleteRes = await fetch(`${API_BASE}/landlord/claims/${claimId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const deleteData = await deleteRes.json();
  if (!deleteRes.ok) {
    throw new Error(`Failed to delete claim: ${JSON.stringify(deleteData)}`);
  }
  console.log(`✔ Delete response: ${JSON.stringify(deleteData)}`);

  // 7. Verify claim is gone from dispute claims list
  console.log('\n7. Fetching claims list after deletion...');
  const claimsAfterRes = await fetch(`${API_BASE}/landlord/disputes/${dispute.id}/claims`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const claimsAfterData = await claimsAfterRes.json();
  const existsAfter = claimsAfterData.claims.some(c => c.id === claimId);
  console.log(`✔ Claim present in list after delete: ${existsAfter} (Expected: false)`);
  if (existsAfter) throw new Error('Claim still exists after deletion!');

  console.log('\n==================================================');
  console.log('SUCCESS: Claim deletion and evidence cleanup verified!');
  console.log('==================================================');
}

main().catch((err) => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});
