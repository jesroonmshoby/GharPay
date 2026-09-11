const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fix() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);

  const updated = await prisma.user.updateMany({
    where: {
      passwordHash: 'dummy_hash'
    },
    data: {
      passwordHash: hash
    }
  });

  console.log(`Updated ${updated.count} user(s) with valid passwordHash for password123`);
  await prisma.$disconnect();
}

fix().catch(console.error);
