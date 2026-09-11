const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findUnique({
    where: { email: 'priya.mediator@gharpay.in' }
  });
  console.log('User priya:', user);
  if (user && user.passwordHash) {
    const match1 = await bcrypt.compare('password123', user.passwordHash);
    console.log('Match with password123:', match1);
  } else {
    console.log('User has no passwordHash');
    // Set passwordHash for demo mediator if needed
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    await prisma.user.update({
      where: { email: 'priya.mediator@gharpay.in' },
      data: { passwordHash: hash }
    });
    console.log('Updated passwordHash for priya.mediator@gharpay.in');
  }
  await prisma.$disconnect();
}

test().catch(console.error);
