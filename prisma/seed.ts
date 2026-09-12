import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GharPay database...');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Seed Landlord Ramesh Kumar
  let landlord = await prisma.user.findUnique({
    where: { email: 'ramesh@demo.com' },
  });

  if (!landlord) {
    landlord = await prisma.user.create({
      data: {
        name: 'Ramesh Kumar',
        email: 'ramesh@demo.com',
        phone: '+919876543211',
        passwordHash,
        role: UserRole.LANDLORD,
      },
    });
    console.log(`✓ Created Landlord account: Ramesh Kumar (${landlord.id})`);
  } else {
    console.log(`✓ Landlord account already exists: Ramesh Kumar (${landlord.id})`);
  }

  // 2. Seed Tenant Aarav Sharma
  let tenant = await prisma.user.findUnique({
    where: { email: 'aarav@demo.com' },
  });

  if (!tenant) {
    tenant = await prisma.user.create({
      data: {
        name: 'Aarav Sharma',
        email: 'aarav@demo.com',
        phone: '+919876543212',
        passwordHash,
        role: UserRole.TENANT,
      },
    });
    console.log(`✓ Created Tenant account: Aarav Sharma (${tenant.id})`);
  } else {
    console.log(`✓ Tenant account already exists: Aarav Sharma (${tenant.id})`);
  }

  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
