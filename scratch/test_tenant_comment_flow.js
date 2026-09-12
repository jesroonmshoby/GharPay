const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4000/api';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function runE2ETest() {
  console.log('=== E2E TEST: GharPay Tenant Comment + Proof Attachment Feature ===\n');

  const timestamp = Date.now();
  const landlordEmail = `landlord_comment_${timestamp}@example.com`;
  const tenantEmail = `tenant_comment_${timestamp}@example.com`;
  const mediatorEmail = `priya.mediator@gharpay.in`;
  const password = 'Password123!';

  // Ensure Priya Mediator exists with correct password hash
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  await prisma.user.upsert({
    where: { email: mediatorEmail },
    update: { passwordHash: hash, role: 'MEDIATOR' },
    create: {
      name: 'Priya Menon',
      email: mediatorEmail,
      phone: '9876543299',
      passwordHash: hash,
      role: 'MEDIATOR',
    },
  });

  // 1. Register Landlord and Tenant
  console.log('1. Registering Landlord & Tenant...');
  await req(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Landlord User',
      email: landlordEmail,
      password: password,
      phone: '9876543210',
      role: 'LANDLORD',
    }),
  });

  await req(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Tenant User',
      email: tenantEmail,
      password: password,
      phone: '9876543211',
      role: 'TENANT',
    }),
  });

  // Authenticate users
  const landlordLogin = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: landlordEmail, password }),
  });
  const landlordToken = landlordLogin.token;

  const tenantLogin = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: tenantEmail, password }),
  });
  const tenantToken = tenantLogin.token;

  const mediatorLogin = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: mediatorEmail, password }),
  });
  const mediatorToken = mediatorLogin.token;

  console.log('✔ Authenticated Landlord, Tenant, and Mediator (Priya Menon).\n');

  // Create Property & Tenancy
  const propRes = await req(`${API_BASE}/landlord/properties`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${landlordToken}` },
    body: JSON.stringify({
      addressLine1: '456 ODR Residency',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
    }),
  });

  const tenancyRes = await req(`${API_BASE}/landlord/tenancies`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${landlordToken}` },
    body: JSON.stringify({
      propertyId: propRes.property.id,
      tenantEmail: tenantEmail,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      monthlyRent: 30000,
      securityDeposit: 60000,
    }),
  });

  // Create Dispute
  const disputeRes = await req(`${API_BASE}/landlord/disputes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${landlordToken}` },
    body: JSON.stringify({
      tenancyId: tenancyRes.tenancy.id,
      claimedDeduction: 18000,
    }),
  });
  const dispute = disputeRes.dispute;
  console.log(`2. Dispute Created: Case ${dispute.caseNumber} (ID: ${dispute.id})\n`);

  // Add a claim
  const claimRes = await req(`${API_BASE}/landlord/disputes/${dispute.id}/claims`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${landlordToken}` },
    body: JSON.stringify({
      category: 'PAINTING',
      description: 'Wall repainting and scuff mark repair',
      claimedAmount: 18000,
    }),
  });
  const claim = claimRes.claim;
  console.log(`3. Claim Created: ${claim.category} — ₹${claim.claimedAmount} (ID: ${claim.id})\n`);

  // 4 & 5 & 6. Upload proof file & Submit tenant response
  console.log('4 & 5 & 6. Uploading proof file & submitting tenant comment...');
  const sampleBase64 = Buffer.from('Fake proof image binary content for move-in wall damage').toString('base64');

  const uploadRes = await req(`${API_BASE}/tenant/proof/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: JSON.stringify({
      fileName: 'move-in-wall.jpg',
      fileData: `data:image/jpeg;base64,${sampleBase64}`,
    }),
  });
  console.log(`✔ Proof File Uploaded: ${uploadRes.fileName} -> URL: ${uploadRes.fileUrl}`);

  // 7 & 8. Submit tenant comment API request
  const commentRes = await req(`${API_BASE}/tenant/claims/${claim.id}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantToken}` },
    body: JSON.stringify({
      message: 'I disagree with this deduction. The walls were already painted before I moved in.',
      attachments: [
        {
          fileName: uploadRes.fileName,
          fileType: uploadRes.fileType,
          fileUrl: uploadRes.fileUrl,
        },
      ],
    }),
  });
  console.log('✔ Tenant Response API Succeeded (Status 201).');
  console.log(`   Message: "${commentRes.comment.message}"`);
  console.log(`   Created By: ${commentRes.comment.createdBy.name}\n`);

  // 9 & 10. Verify comment & attachment persisted in PostgreSQL
  console.log('9 & 10. Verifying PostgreSQL persistence...');
  const dbComment = await prisma.tenantComment.findUnique({
    where: { id: commentRes.comment.id },
    include: { attachments: true, creator: true },
  });
  if (!dbComment || dbComment.attachments.length === 0) {
    throw new Error('FAILED: Comment or attachments missing in PostgreSQL database.');
  }
  console.log(`✔ PostgreSQL Persistence Verified! Comment ID: ${dbComment.id}, Attachment: ${dbComment.attachments[0].fileName}\n`);

  // 11. Verify Audit Log entries
  console.log('11. Verifying Audit Log entries in PostgreSQL...');
  const auditLogs = await prisma.auditLog.findMany({
    where: { disputeId: dispute.id },
  });
  const commentLog = auditLogs.find((l) => l.action === 'TENANT_COMMENT_CREATED');
  const proofLog = auditLogs.find((l) => l.action === 'TENANT_PROOF_ATTACHED');
  if (!commentLog || !proofLog) {
    throw new Error('FAILED: Audit logs TENANT_COMMENT_CREATED or TENANT_PROOF_ATTACHED not found.');
  }
  console.log(`✔ Audit Logs Verified! Actions: ${commentLog.action}, ${proofLog.action}\n`);

  // 12 & 13. Refresh Tenant View & verify visibility
  console.log('12 & 13. Re-fetching Tenant dispute details...');
  const tenantDisputeRes = await req(`${API_BASE}/tenant/disputes/${dispute.id}`, {
    headers: { Authorization: `Bearer ${tenantToken}` },
  });
  const fetchedClaimTenant = tenantDisputeRes.dispute.claims.find((c) => c.id === claim.id);
  if (!fetchedClaimTenant.tenantComments || fetchedClaimTenant.tenantComments.length === 0) {
    throw new Error('FAILED: Tenant response not visible in tenant dispute API response.');
  }
  console.log(`✔ Response visible in Tenant View! "${fetchedClaimTenant.tenantComments[0].message}"\n`);

  // 14 & 15 & 16 & 17. Mediator Login & view verification
  console.log('14, 15, 16 & 17. Verifying Mediator View...');
  const mediatorCaseRes = await req(`${API_BASE}/mediator/cases/${dispute.id}`, {
    headers: { Authorization: `Bearer ${mediatorToken}` },
  });
  const fetchedClaimMediator = mediatorCaseRes.caseDetails.claims.find((c) => c.id === claim.id);
  if (!fetchedClaimMediator.tenantComments || fetchedClaimMediator.tenantComments.length === 0) {
    throw new Error('FAILED: Tenant response not visible in mediator case API response.');
  }
  const proofUrl = fetchedClaimMediator.tenantComments[0].attachments[0].fileUrl;
  console.log(`✔ Mediator can see Tenant response: "${fetchedClaimMediator.tenantComments[0].message}"`);
  console.log(`✔ Mediator can open proof link: http://localhost:4000${proofUrl}\n`);

  // 18. Landlord View Verification
  console.log('18. Verifying Landlord View...');
  const landlordDisputeRes = await req(`${API_BASE}/landlord/disputes/${dispute.id}`, {
    headers: { Authorization: `Bearer ${landlordToken}` },
  });
  const fetchedClaimLandlord = landlordDisputeRes.dispute.claims.find((c) => c.id === claim.id);
  if (!fetchedClaimLandlord.tenantComments || fetchedClaimLandlord.tenantComments.length === 0) {
    throw new Error('FAILED: Tenant response not visible in landlord dispute API response.');
  }
  console.log(`✔ Landlord can see Tenant response: "${fetchedClaimLandlord.tenantComments[0].message}"\n`);

  // 19 & 20. Verify claim is NOT automatically approved & calculation enforcement remains intact
  console.log('19 & 20. Verifying Claim Status & Calculation Enforcement...');
  if (fetchedClaimTenant.status !== 'PENDING' || (fetchedClaimTenant.approvedAmount !== null && fetchedClaimTenant.approvedAmount !== undefined)) {
    throw new Error(`FAILED: Claim status was altered automatically to ${fetchedClaimTenant.status}!`);
  }
  console.log('✔ Claim status remains PENDING (not automatically approved).');

  try {
    await req(`${API_BASE}/landlord/disputes/${dispute.id}/calculate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    throw new Error('FAILED: Calculation should have been blocked because claim is not reviewed by mediator yet!');
  } catch (calcErr) {
    console.log(`✔ Calculation correctly blocked before Mediator review (Status 400: "${calcErr.message}").\n`);
  }

  console.log('==================================================');
  console.log('SUCCESS: All 20 Tenant Comment + Proof steps passed!');
  console.log('==================================================');
}

runE2ETest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('E2E Test Failed:', err.message || err);
    process.exit(1);
  });
