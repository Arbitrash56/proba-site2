import { PrismaClient } from '@prisma/client';

// Prisma 7 требует адаптер для SQLite
const prisma = new PrismaClient().$extends({});

async function main() {
  console.log('🌱 Creating minimal seed data...');

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'brand1' },
    update: {},
    create: {
      slug: 'brand1',
      hostnames: JSON.stringify(['localhost', 'brand1.local']),
      name: 'CPA Platform',
      themeConfig: JSON.stringify({ primaryColor: '#8B5CF6' }),
      settings: JSON.stringify({ minPayout: 100 }),
      referralConfig: JSON.stringify({ L1: 10, L2: 5, L3: 2, L4: 1, L5: 1, L6: 0.5, L7: 0.5 }),
    },
  });

  console.log('✅ Tenant created:', tenant.name);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.local' },
    update: {},
    create: {
      tenantId: tenant.id,
      role: 'ADMIN',
      email: 'admin@test.local',
      emailVerified: true,
      profile: JSON.stringify({ firstName: 'Admin', lastName: 'User' }),
      payoutMethods: JSON.stringify([]),
      referralCode: 'ADMIN001',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin created:', admin.email);
  console.log('');
  console.log('🎉 Seed completed!');
  console.log('');
  console.log('Test user: admin@test.local');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
