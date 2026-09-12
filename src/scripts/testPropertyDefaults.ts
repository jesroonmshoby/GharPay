import { prisma } from '../lib/prisma';

async function testPropertyDefaults() {
  console.log('Testing Property creation with default and custom values...');

  // 1. Default creation (simulating frontend payload with defaults)
  const defaultPayload = {
    addressLine1: '402 Sunshine Apartments, Whitefield Main Rd',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560066',
  };

  const prop1 = await prisma.property.create({
    data: defaultPayload,
  });

  console.log('✔ Property created with defaults:', prop1.id, '->', prop1.city, prop1.state);
  if (prop1.city !== 'Bengaluru' || prop1.state !== 'Karnataka') {
    throw new Error('Default property test failed');
  }

  // 2. Custom creation (simulating user editing city & state)
  const customPayload = {
    addressLine1: '12 Marine Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400020',
  };

  const prop2 = await prisma.property.create({
    data: customPayload,
  });

  console.log('✔ Property created with custom values:', prop2.id, '->', prop2.city, prop2.state);
  if (prop2.city !== 'Mumbai' || prop2.state !== 'Maharashtra') {
    throw new Error('Custom property test failed');
  }

  // Clean up test properties
  await prisma.property.delete({ where: { id: prop1.id } });
  await prisma.property.delete({ where: { id: prop2.id } });

  console.log('\n====================================================');
  console.log('  PROPERTY DEFAULTS TEST PASSED SUCCESSFULLY! 🎉   ');
  console.log('====================================================');
}

testPropertyDefaults()
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
