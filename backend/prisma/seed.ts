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

  // Создаём пользователя Правительство
  const governmentPassword = await bcrypt.hash('gov123', 10);
  const government = await prisma.user.upsert({
    where: { email: 'government@kchr.ru' },
    update: {},
    create: {
      email: 'government@kchr.ru',
      name: 'Представитель правительства',
      passwordHash: governmentPassword,
      role: Role.GOVERNMENT,
      tenantId: tenant.id,
    },
  });

  console.log('Создан пользователь правительства:', government.email);

  // Создаём бухгалтера
  const accountantPassword = await bcrypt.hash('acc123', 10);
  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@kchr.ru' },
    update: {},
    create: {
      email: 'accountant@kchr.ru',
      name: 'Бухгалтер',
      passwordHash: accountantPassword,
      role: Role.ACCOUNTANT,
      tenantId: tenant.id,
    },
  });

  console.log('Создан бухгалтер:', accountant.email);

  // Создаём технадзор
  const technadzorPassword = await bcrypt.hash('tech123', 10);
  const technadzor = await prisma.user.upsert({
    where: { email: 'technadzor@kchr.ru' },
    update: {},
    create: {
      email: 'technadzor@kchr.ru',
      name: 'Технический надзор',
      passwordHash: technadzorPassword,
      role: Role.TECHNADZOR,
      tenantId: tenant.id,
    },
  });

  console.log('Создан технадзор:', technadzor.email);

  // Создаём проверяющего
  const inspectorPassword = await bcrypt.hash('insp123', 10);
  const inspector = await prisma.user.upsert({
    where: { email: 'inspector@kchr.ru' },
    update: {},
    create: {
      email: 'inspector@kchr.ru',
      name: 'Проверяющий',
      passwordHash: inspectorPassword,
      role: Role.INSPECTOR,
      tenantId: tenant.id,
    },
  });

  console.log('Создан проверяющий:', inspector.email);

  // Создаём подрядчика
  const contractorUserPassword = await bcrypt.hash('contr123', 10);
  const contractorUser = await prisma.user.upsert({
    where: { email: 'contractor@kchr.ru' },
    update: {},
    create: {
      email: 'contractor@kchr.ru',
      name: 'Подрядчик',
      passwordHash: contractorUserPassword,
      role: Role.CONTRACTOR,
      tenantId: tenant.id,
    },
  });

  console.log('Создан подрядчик:', contractorUser.email);

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
  console.log('Правительство: government@kchr.ru / gov123');
  console.log('Бухгалтер: accountant@kchr.ru / acc123');
  console.log('Технадзор: technadzor@kchr.ru / tech123');
  console.log('Проверяющий: inspector@kchr.ru / insp123');
  console.log('Подрядчик: contractor@kchr.ru / contr123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
