import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GharPay database...');

  const priyaEmail = 'priya.mediator@gharpay.in';

  const existingPriya = await prisma.user.findUnique({
    where: { email: priyaEmail },
  });

  if (existingPriya) {
    console.log(`✓ Priya Menon mediator account already exists (ID: ${existingPriya.id})`);
  } else {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const priya = await prisma.user.create({
      data: {
        name: 'Priya Menon',
        email: priyaEmail,
        phone: '+919876543210',
        passwordHash,
        role: UserRole.MEDIATOR,
      },
    });

    console.log(`✓ Created Priya Menon default mediator account (ID: ${priya.id})`);
  }
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
