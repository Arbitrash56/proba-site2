import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================================
  // TENANTS (3 brands)
  // ============================================================================
  console.log('Creating tenants...');

  const tenant1 = await prisma.tenant.upsert({
    where: { slug: 'brand1' },
    update: {},
    create: {
      slug: 'brand1',
      hostnames: JSON.stringify(['brand1.local', 'localhost']),
      name: 'Brand One - Финансовые задачи',
      logoUrl: '/logos/brand1.png',
      themeConfig: JSON.stringify({
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899',
      }),
      settings: JSON.stringify({
        minPayout: 100,
        maxPayout: 50000,
        payoutCooldownDays: 7,
        requireKycForPayout: false,
        supportEmail: 'support@brand1.local',
      }),
      referralConfig: JSON.stringify({
        L1: 10,
        L2: 5,
        L3: 2,
        L4: 1,
        L5: 1,
        L6: 0.5,
        L7: 0.5,
      }),
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'brand2' },
    update: {},
    create: {
      slug: 'brand2',
      hostnames: ['brand2.local'],
      name: 'Brand Two - Опросы и тесты',
      logoUrl: '/logos/brand2.png',
      themeConfig: {
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
      },
      settings: {
        minPayout: 50,
        maxPayout: 10000,
        payoutCooldownDays: 3,
        requireKycForPayout: false,
        supportEmail: 'support@brand2.local',
      },
      referralConfig: {
        L1: 15,
        L2: 7,
        L3: 3,
        L4: 1,
        L5: 0.5,
        L6: 0.5,
        L7: 0.5,
      },
    },
  });

  const tenant3 = await prisma.tenant.upsert({
    where: { slug: 'brand3' },
    update: {},
    create: {
      slug: 'brand3',
      hostnames: ['brand3.local'],
      name: 'Brand Three - Приложения и игры',
      logoUrl: '/logos/brand3.png',
      themeConfig: {
        primaryColor: '#F59E0B',
        secondaryColor: '#EF4444',
      },
      settings: {
        minPayout: 200,
        maxPayout: 20000,
        payoutCooldownDays: 5,
        requireKycForPayout: false,
        supportEmail: 'support@brand3.local',
      },
      referralConfig: {
        L1: 12,
        L2: 6,
        L3: 2,
        L4: 1,
        L5: 1,
        L6: 1,
        L7: 0.5,
      },
    },
  });

  console.log(`✓ Created 3 tenants`);

  // ============================================================================
  // USERS (for brand1)
  // ============================================================================
  console.log('Creating users...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@brand1.local' },
    update: {},
    create: {
      tenantId: tenant1.id,
      role: 'ADMIN',
      email: 'admin@brand1.local',
      emailVerified: true,
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        country: 'RU',
      },
      referralCode: 'ADMIN2026',
      status: 'ACTIVE',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@brand1.local' },
    update: {},
    create: {
      tenantId: tenant1.id,
      role: 'MANAGER',
      email: 'manager@brand1.local',
      emailVerified: true,
      profile: {
        firstName: 'Manager',
        lastName: 'Support',
        country: 'RU',
      },
      referralCode: 'MANAGER01',
      status: 'ACTIVE',
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user@brand1.local' },
    update: {},
    create: {
      tenantId: tenant1.id,
      role: 'USER',
      email: 'user@brand1.local',
      emailVerified: true,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        country: 'RU',
        city: 'Moscow',
      },
      referralCode: 'JOHNDOE123',
      status: 'ACTIVE',
    },
  });

  // Create ledger accounts for users
  await prisma.ledgerAccount.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      currency: 'RUB',
      balanceAvailable: 0,
      balancePending: 0,
      balanceFrozen: 0,
    },
  });

  console.log(`✓ Created 3 users (admin, manager, user)`);

  // ============================================================================
  // OFFERS (for brand1)
  // ============================================================================
  console.log('Creating offers...');

  const offer1 = await prisma.offer.create({
    data: {
      tenantId: tenant1.id,
      title: 'Оформить кредитную карту Тинькофф',
      description:
        'Оформите кредитную карту Тинькофф Platinum с лимитом до 700 000 руб. Одобрение за 2 минуты онлайн. Бесплатное обслуживание навсегда.',
      category: 'FINANCE',
      imageUrl: '/offers/tinkoff-card.jpg',
      rewardAmount: 500,
      rewardCurrency: 'RUB',
      difficultyLevel: 'EASY',
      estimatedTime: 10,
      requiresVerification: false,
      reimbursementEnabled: false,
      termsAndConditions: `
# Условия оформления

1. Вам должно быть от 18 до 70 лет
2. Вы гражданин РФ с российским паспортом
3. У вас есть действующий номер телефона

## Этапы выполнения

1. Перейдите на сайт банка по ссылке
2. Заполните анкету (ФИО, паспорт, доход)
3. Дождитесь одобрения (обычно 1-2 минуты)
4. Загрузите скриншот подтверждения
5. Отправьте на проверку

## Выплата

Награда в размере 500 руб. будет начислена после проверки менеджером (обычно в течение 24 часов).

## Важно

- Не пытайтесь обмануть систему
- Предоставляйте реальные данные
- Один оффер можно выполнить только 1 раз
      `,
      disclaimers: [
        'Банк может отказать в выдаче карты',
        'Одобрение не гарантируется',
        'Награда выплачивается только при успешном оформлении',
        'Не используйте чужие данные',
      ],
      limits: {
        maxCompletionsPerUser: 1,
        dailyLimit: 50,
      },
      isActive: true,
    },
  });

  // Create steps for offer1
  await prisma.offerStep.createMany({
    data: [
      {
        offerId: offer1.id,
        order: 0,
        type: 'INFO',
        title: 'Ознакомьтесь с условиями',
        description: 'Внимательно прочитайте условия выполнения задания',
        schema: {
          content: `
<div class="space-y-4">
  <h3 class="text-xl font-bold">Что нужно сделать:</h3>
  <ol class="list-decimal list-inside space-y-2">
    <li>Перейти на сайт банка по ссылке</li>
    <li>Заполнить анкету на оформление карты</li>
    <li>Получить одобрение</li>
    <li>Загрузить скриншот подтверждения</li>
  </ol>

  <div class="bg-yellow-50 p-4 rounded">
    <p class="text-sm"><strong>Важно:</strong> Используйте только свои реальные данные!</p>
  </div>
</div>
          `,
        },
        isRequired: true,
      },
      {
        offerId: offer1.id,
        order: 1,
        type: 'CONFIRM',
        title: 'Подтверждение согласия',
        description: 'Подтвердите, что вы ознакомились с условиями',
        schema: {
          checkboxes: [
            {
              id: 'agree_terms',
              label: 'Я прочитал(а) и согласен(а) с условиями выполнения задания',
              required: true,
            },
            {
              id: 'agree_real_data',
              label: 'Я буду использовать только свои реальные данные',
              required: true,
            },
            {
              id: 'agree_bank_terms',
              label: 'Я ознакомлен(а) с условиями банка',
              required: true,
            },
          ],
        },
        isRequired: true,
      },
      {
        offerId: offer1.id,
        order: 2,
        type: 'FORM',
        title: 'Основная информация',
        description: 'Введите ваши данные для отслеживания заявки',
        schema: {
          fields: [
            {
              name: 'fullName',
              type: 'text',
              label: 'ФИО (как в паспорте)',
              placeholder: 'Иванов Иван Иванович',
              required: true,
            },
            {
              name: 'phone',
              type: 'tel',
              label: 'Номер телефона',
              placeholder: '+7 (900) 123-45-67',
              required: true,
            },
            {
              name: 'applicationId',
              type: 'text',
              label: 'Номер заявки (если есть)',
              placeholder: '123456789',
              required: false,
            },
          ],
        },
        isRequired: true,
      },
      {
        offerId: offer1.id,
        order: 3,
        type: 'UPLOAD',
        title: 'Загрузите подтверждение',
        description: 'Скриншот страницы одобрения или email-подтверждение',
        schema: {
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxSizeMb: 5,
          minFiles: 1,
          maxFiles: 3,
        },
        isRequired: true,
      },
      {
        offerId: offer1.id,
        order: 4,
        type: 'QUIZ',
        title: 'Контрольный вопрос',
        description: 'Подтвердите, что вы действительно выполнили задание',
        schema: {
          questions: [
            {
              question: 'Вы использовали свои реальные данные?',
              options: ['Да', 'Нет'],
              correct: 0,
            },
            {
              question: 'Вы получили одобрение заявки?',
              options: ['Да', 'Нет', 'Ожидаю'],
              correct: 0,
            },
          ],
        },
        isRequired: true,
      },
    ],
  });

  const offer2 = await prisma.offer.create({
    data: {
      tenantId: tenant1.id,
      title: 'Заполнить анкету на автокредит',
      description: 'Оставьте заявку на автокредит и получите предварительное одобрение',
      category: 'FINANCE',
      imageUrl: '/offers/auto-loan.jpg',
      rewardAmount: 300,
      rewardCurrency: 'RUB',
      difficultyLevel: 'MEDIUM',
      estimatedTime: 15,
      requiresVerification: false,
      termsAndConditions: 'Условия выполнения автокредитной анкеты...',
      disclaimers: ['Одобрение не гарантируется', 'Только для граждан РФ 21+'],
      limits: {
        maxCompletionsPerUser: 1,
      },
      isActive: true,
    },
  });

  console.log(`✓ Created 2 offers with steps`);

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Tenants: 3 (brand1, brand2, brand3)`);
  console.log(`   Users: 3 (admin, manager, user)`);
  console.log(`   Offers: 2`);
  console.log('');
  console.log('🔑 Test credentials:');
  console.log(`   Admin: admin@brand1.local`);
  console.log(`   Manager: manager@brand1.local`);
  console.log(`   User: user@brand1.local`);
  console.log('');
  console.log('💡 Use OTP code in development (check console logs)');
  console.log('');
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
