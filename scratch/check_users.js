const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('Registered Database Users:');
  console.log(users);
  await prisma.$disconnect();
}

check().catch(console.error);
