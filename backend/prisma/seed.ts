import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Создаём тестовый тенант
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'kchr' },
    update: {},
    create: {
      name: 'Министерство строительства КЧР',
      slug: 'kchr',
    },
  });

  console.log('Создан тенант:', tenant.name);

  // Создаём суперадмина
  const superadminPassword = await bcrypt.hash('admin123', 10);
  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@build-control.ru' },
    update: {},
    create: {
      email: 'admin@build-control.ru',
      name: 'Суперадмин',
      passwordHash: superadminPassword,
      role: Role.SUPERADMIN,
      tenantId: null,
    },
  });

  console.log('Создан суперадмин:', superadmin.email);

  // Создаём министра для тенанта
  const ministerPassword = await bcrypt.hash('minister123', 10);
  const minister = await prisma.user.upsert({
    where: { email: 'minister@kchr.ru' },
    update: {},
    create: {
      email: 'minister@kchr.ru',
      name: 'Министр строительства',
      passwordHash: ministerPassword,
      role: Role.MINISTER,
      tenantId: tenant.id,
    },
  });

  console.log('Создан министр:', minister.email);

  // Создаём типы техники
  const equipmentTypes = [
    'Экскаватор',
    'Самосвал',
    'Автокран',
    'Бетоносмеситель',
    'Бульдозер',
    'Погрузчик',
  ];

  for (const name of equipmentTypes) {
    await prisma.equipmentType.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name,
      },
    });
  }

  console.log('Созданы типы техники:', equipmentTypes.length);

  // Создаём тестового подрядчика
  const contractor = await prisma.contractor.upsert({
    where: { id: 'test-contractor' },
    update: {},
    create: {
      id: 'test-contractor',
      tenantId: tenant.id,
      name: 'ООО "СтройГарант"',
      inn: '0901234567',
      phone: '+7 (928) 123-45-67',
      email: 'info@stroygarant.ru',
    },
  });

  console.log('Создан подрядчик:', contractor.name);

  console.log('\n=== Тестовые данные созданы успешно ===');
  console.log('\nДанные для входа:');
  console.log('Суперадмин: admin@build-control.ru / admin123');
  console.log('Министр: minister@kchr.ru / minister123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
