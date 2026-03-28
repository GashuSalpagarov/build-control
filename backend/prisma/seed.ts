import { PrismaClient, Role, ObjectStatus, AppealStatus, AppealType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function dateOnly(d: Date): Date {
  return new Date(d.toISOString().split('T')[0]);
}

async function main() {
  console.log('Очистка базы...');
  await prisma.equipmentCheck.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.appealMessage.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.volumeCheck.deleteMany();
  await prisma.resourceCheck.deleteMany();
  await prisma.plannedEquipment.deleteMany();
  await prisma.stageScheduleChange.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.userObjectAssignment.deleteMany();
  await prisma.object.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.equipmentType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // === ТЕНАНТ ===
  const tenant = await prisma.tenant.create({
    data: { name: 'Министерство строительства КЧР', slug: 'kchr' },
  });

  // === ПОЛЬЗОВАТЕЛИ ===
  const hash = async (p: string) => bcrypt.hash(p, 10);

  const superadmin = await prisma.user.create({
    data: {
      email: 'admin@build-control.ru',
      name: 'Салпагаров Гашу',
      passwordHash: await hash('admin123'),
      role: Role.SUPERADMIN,
      phone: '+7 (928) 900-00-01',
    },
  });

  const minister = await prisma.user.create({
    data: {
      email: 'minister@kchr.ru',
      name: 'Эркенов Рашид Хусеинович',
      passwordHash: await hash('minister123'),
      role: Role.MINISTER,
      tenantId: tenant.id,
      phone: '+7 (878) 222-11-01',
    },
  });

  const government = await prisma.user.create({
    data: {
      email: 'government@kchr.ru',
      name: 'Озов Мурат Кемалович',
      passwordHash: await hash('gov123'),
      role: Role.GOVERNMENT,
      tenantId: tenant.id,
      phone: '+7 (878) 222-11-02',
    },
  });

  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@kchr.ru',
      name: 'Батчаева Фатима Ахматовна',
      passwordHash: await hash('acc123'),
      role: Role.ACCOUNTANT,
      tenantId: tenant.id,
      phone: '+7 (878) 222-11-03',
    },
  });

  const technadzor = await prisma.user.create({
    data: {
      email: 'technadzor@kchr.ru',
      name: 'Хубиев Алим Расулович',
      passwordHash: await hash('tech123'),
      role: Role.TECHNADZOR,
      tenantId: tenant.id,
      phone: '+7 (928) 900-11-04',
    },
  });

  const inspector = await prisma.user.create({
    data: {
      email: 'inspector@kchr.ru',
      name: 'Джанибеков Тимур Маратович',
      passwordHash: await hash('insp123'),
      role: Role.INSPECTOR,
      tenantId: tenant.id,
      phone: '+7 (928) 900-11-05',
    },
  });

  const contractorUser = await prisma.user.create({
    data: {
      email: 'contractor@kchr.ru',
      name: 'Байрамуков Ислам Муратович',
      passwordHash: await hash('contr123'),
      role: Role.CONTRACTOR,
      tenantId: tenant.id,
      phone: '+7 (928) 900-11-06',
    },
  });

  // === ТИПЫ ТЕХНИКИ ===
  const equipmentNames = [
    'Экскаватор гусеничный',
    'Самосвал КАМАЗ',
    'Автокран 25т',
    'Бетоносмеситель',
    'Бульдозер',
    'Фронтальный погрузчик',
    'Каток дорожный',
    'Асфальтоукладчик',
    'Автобетононасос',
    'Башенный кран',
  ];

  const equipmentTypes: Record<string, any> = {};
  for (const name of equipmentNames) {
    equipmentTypes[name] = await prisma.equipmentType.create({
      data: { tenantId: tenant.id, name },
    });
  }

  // === ПОДРЯДЧИКИ ===
  const contractor1 = await prisma.contractor.create({
    data: {
      tenantId: tenant.id,
      name: 'ООО "СтройГарант"',
      inn: '0901234567',
      phone: '+7 (878) 555-12-34',
      email: 'info@stroygarant.ru',
    },
  });

  const contractor2 = await prisma.contractor.create({
    data: {
      tenantId: tenant.id,
      name: 'ООО "КавказСтрой"',
      inn: '0905678901',
      phone: '+7 (878) 555-56-78',
      email: 'info@kavkazstroy.ru',
    },
  });

  const contractor3 = await prisma.contractor.create({
    data: {
      tenantId: tenant.id,
      name: 'ООО "Домострой"',
      inn: '0909012345',
      phone: '+7 (878) 555-90-12',
      email: 'office@domostroy09.ru',
    },
  });

  const contractor4 = await prisma.contractor.create({
    data: {
      tenantId: tenant.id,
      name: 'АО "МостДорСтрой"',
      inn: '0907654321',
      phone: '+7 (878) 555-76-54',
      email: 'info@mostdorstroy.ru',
    },
  });

  // === ОБЪЕКТЫ ===

  // 1. Школа — в работе, 45%
  const school = await prisma.object.create({
    data: {
      tenantId: tenant.id,
      contractorId: contractor1.id,
      name: 'Строительство средней школы на 500 мест',
      address: 'г. Черкесск, ул. Ленина, 120',
      startDate: daysAgo(180),
      endDate: daysFromNow(200),
      budget: 450000000,
      progress: 45,
      status: ObjectStatus.IN_PROGRESS,
    },
  });

  // 2. Детский сад — в работе, 72%
  const kindergarten = await prisma.object.create({
    data: {
      tenantId: tenant.id,
      contractorId: contractor2.id,
      name: 'Строительство детского сада на 220 мест',
      address: 'г. Черкесск, мкр. Юбилейный, д. 15А',
      startDate: daysAgo(300),
      endDate: daysFromNow(60),
      budget: 280000000,
      progress: 72,
      status: ObjectStatus.IN_PROGRESS,
    },
  });

  // 3. Дорога — в работе, 30%
  const road = await prisma.object.create({
    data: {
      tenantId: tenant.id,
      contractorId: contractor4.id,
      name: 'Реконструкция автодороги Черкесск — Домбай, участок км 45-62',
      address: 'Карачаевский район, а/д Черкесск — Домбай',
      startDate: daysAgo(90),
      endDate: daysFromNow(270),
      budget: 820000000,
      progress: 30,
      status: ObjectStatus.IN_PROGRESS,
    },
  });

  // 4. Поликлиника — запланирована
  const clinic = await prisma.object.create({
    data: {
      tenantId: tenant.id,
      contractorId: contractor3.id,
      name: 'Строительство поликлиники на 150 посещений в смену',
      address: 'г. Карачаевск, ул. Мира, 45',
      startDate: daysFromNow(30),
      endDate: daysFromNow(400),
      budget: 520000000,
      progress: 0,
      status: ObjectStatus.PLANNED,
    },
  });

  // 5. Спорткомплекс — завершён
  const sportComplex = await prisma.object.create({
    data: {
      tenantId: tenant.id,
      contractorId: contractor1.id,
      name: 'Строительство физкультурно-оздоровительного комплекса',
      address: 'г. Усть-Джегута, ул. Спортивная, 1',
      startDate: daysAgo(540),
      endDate: daysAgo(30),
      budget: 195000000,
      progress: 100,
      status: ObjectStatus.COMPLETED,
    },
  });

  // 6. МКД — приостановлен
  const apartment = await prisma.object.create({
    data: {
      tenantId: tenant.id,
      contractorId: contractor2.id,
      name: 'Строительство многоквартирного жилого дома (72 квартиры)',
      address: 'г. Черкесск, ул. Космонавтов, 28',
      startDate: daysAgo(240),
      endDate: daysFromNow(180),
      budget: 380000000,
      progress: 35,
      status: ObjectStatus.SUSPENDED,
    },
  });

  console.log('Создано 6 объектов');

  // === ЭТАПЫ для школы ===
  const schoolStages = await Promise.all([
    prisma.stage.create({
      data: {
        objectId: school.id, name: 'Подготовка площадки и земляные работы',
        startDate: daysAgo(180), endDate: daysAgo(140),
        budget: 25000000, plannedPeople: 15, sortOrder: 1,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: school.id, name: 'Фундаментные работы',
        startDate: daysAgo(140), endDate: daysAgo(90),
        budget: 65000000, plannedPeople: 25, sortOrder: 2,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: school.id, name: 'Возведение каркаса и стен',
        startDate: daysAgo(90), endDate: daysFromNow(30),
        budget: 120000000, plannedPeople: 40, sortOrder: 3,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: school.id, name: 'Кровельные работы',
        startDate: daysFromNow(20), endDate: daysFromNow(80),
        budget: 35000000, plannedPeople: 20, sortOrder: 4,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: school.id, name: 'Инженерные сети',
        startDate: daysFromNow(60), endDate: daysFromNow(140),
        budget: 85000000, plannedPeople: 30, sortOrder: 5,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: school.id, name: 'Отделочные работы и благоустройство',
        startDate: daysFromNow(120), endDate: daysFromNow(200),
        budget: 120000000, plannedPeople: 50, sortOrder: 6,
      },
    }),
  ]);

  // === ЭТАПЫ для детского сада ===
  const kgStages = await Promise.all([
    prisma.stage.create({
      data: {
        objectId: kindergarten.id, name: 'Земляные и фундаментные работы',
        startDate: daysAgo(300), endDate: daysAgo(230),
        budget: 40000000, plannedPeople: 20, sortOrder: 1,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: kindergarten.id, name: 'Каркас и ограждающие конструкции',
        startDate: daysAgo(230), endDate: daysAgo(130),
        budget: 80000000, plannedPeople: 35, sortOrder: 2,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: kindergarten.id, name: 'Кровля и инженерные сети',
        startDate: daysAgo(130), endDate: daysAgo(30),
        budget: 70000000, plannedPeople: 30, sortOrder: 3,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: kindergarten.id, name: 'Отделка и оснащение',
        startDate: daysAgo(30), endDate: daysFromNow(60),
        budget: 90000000, plannedPeople: 45, sortOrder: 4,
      },
    }),
  ]);

  // === ЭТАПЫ для дороги ===
  const roadStages = await Promise.all([
    prisma.stage.create({
      data: {
        objectId: road.id, name: 'Подготовительные работы и демонтаж',
        startDate: daysAgo(90), endDate: daysAgo(50),
        budget: 45000000, plannedPeople: 20, sortOrder: 1,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: road.id, name: 'Земляное полотно',
        startDate: daysAgo(50), endDate: daysFromNow(30),
        budget: 180000000, plannedPeople: 30, sortOrder: 2,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: road.id, name: 'Устройство основания дорожной одежды',
        startDate: daysFromNow(20), endDate: daysFromNow(120),
        budget: 220000000, plannedPeople: 35, sortOrder: 3,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: road.id, name: 'Асфальтобетонное покрытие',
        startDate: daysFromNow(100), endDate: daysFromNow(200),
        budget: 280000000, plannedPeople: 40, sortOrder: 4,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: road.id, name: 'Обустройство и разметка',
        startDate: daysFromNow(190), endDate: daysFromNow(270),
        budget: 95000000, plannedPeople: 25, sortOrder: 5,
      },
    }),
  ]);

  // === ЭТАПЫ для спорткомплекса (завершён) ===
  await Promise.all([
    prisma.stage.create({
      data: {
        objectId: sportComplex.id, name: 'Фундамент и каркас',
        startDate: daysAgo(540), endDate: daysAgo(400),
        budget: 60000000, plannedPeople: 25, sortOrder: 1,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: sportComplex.id, name: 'Ограждающие конструкции и кровля',
        startDate: daysAgo(400), endDate: daysAgo(250),
        budget: 55000000, plannedPeople: 20, sortOrder: 2,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: sportComplex.id, name: 'Инженерные сети и отделка',
        startDate: daysAgo(250), endDate: daysAgo(80),
        budget: 50000000, plannedPeople: 35, sortOrder: 3,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: sportComplex.id, name: 'Оснащение и благоустройство',
        startDate: daysAgo(80), endDate: daysAgo(30),
        budget: 30000000, plannedPeople: 20, sortOrder: 4,
      },
    }),
  ]);

  // === ЭТАПЫ для МКД (приостановлен) ===
  await Promise.all([
    prisma.stage.create({
      data: {
        objectId: apartment.id, name: 'Котлован и фундамент',
        startDate: daysAgo(240), endDate: daysAgo(170),
        budget: 75000000, plannedPeople: 20, sortOrder: 1,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: apartment.id, name: 'Монолитный каркас 1-5 этажи',
        startDate: daysAgo(170), endDate: daysAgo(60),
        budget: 120000000, plannedPeople: 40, sortOrder: 2,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: apartment.id, name: 'Монолитный каркас 6-9 этажи',
        startDate: daysAgo(60), endDate: daysFromNow(30),
        budget: 95000000, plannedPeople: 35, sortOrder: 3,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: apartment.id, name: 'Кровля и фасад',
        startDate: daysFromNow(30), endDate: daysFromNow(120),
        budget: 50000000, plannedPeople: 25, sortOrder: 4,
      },
    }),
    prisma.stage.create({
      data: {
        objectId: apartment.id, name: 'Отделка и благоустройство',
        startDate: daysFromNow(100), endDate: daysFromNow(180),
        budget: 40000000, plannedPeople: 30, sortOrder: 5,
      },
    }),
  ]);

  console.log('Созданы этапы для всех объектов');

  // === ПЛАНОВАЯ ТЕХНИКА ===
  await prisma.plannedEquipment.createMany({
    data: [
      { stageId: schoolStages[2].id, equipmentTypeId: equipmentTypes['Башенный кран'].id, quantity: 2 },
      { stageId: schoolStages[2].id, equipmentTypeId: equipmentTypes['Автокран 25т'].id, quantity: 1 },
      { stageId: schoolStages[2].id, equipmentTypeId: equipmentTypes['Бетоносмеситель'].id, quantity: 2 },
      { stageId: schoolStages[2].id, equipmentTypeId: equipmentTypes['Автобетононасос'].id, quantity: 1 },
      { stageId: roadStages[1].id, equipmentTypeId: equipmentTypes['Экскаватор гусеничный'].id, quantity: 3 },
      { stageId: roadStages[1].id, equipmentTypeId: equipmentTypes['Самосвал КАМАЗ'].id, quantity: 8 },
      { stageId: roadStages[1].id, equipmentTypeId: equipmentTypes['Бульдозер'].id, quantity: 2 },
      { stageId: roadStages[1].id, equipmentTypeId: equipmentTypes['Каток дорожный'].id, quantity: 2 },
    ],
  });

  console.log('Плановая техника назначена');

  // === ПРОВЕРКИ РЕСУРСОВ (школа — каркас, 14 дней) ===
  const checksData = [
    { ago: 14, people: 38, comment: null as string | null },
    { ago: 13, people: 40, comment: null as string | null },
    { ago: 12, people: 37, comment: 'Двое на больничном' },
    { ago: 11, people: 35, comment: 'Непогода, часть бригады не вышла' },
    { ago: 10, people: 42, comment: null as string | null },
    { ago: 7, people: 40, comment: null as string | null },
    { ago: 6, people: 41, comment: null as string | null },
    { ago: 5, people: 39, comment: 'Один кран на ТО' },
    { ago: 4, people: 43, comment: 'Дополнительная бригада на монолит' },
    { ago: 3, people: 40, comment: null as string | null },
    { ago: 2, people: 38, comment: null as string | null },
    { ago: 1, people: 41, comment: null as string | null },
  ];

  for (const c of checksData) {
    const check = await prisma.resourceCheck.create({
      data: {
        stageId: schoolStages[2].id,
        userId: inspector.id,
        date: dateOnly(daysAgo(c.ago)),
        checkedAt: daysAgo(c.ago),
        actualPeople: c.people,
        comment: c.comment,
      },
    });

    await prisma.equipmentCheck.createMany({
      data: [
        { resourceCheckId: check.id, equipmentTypeId: equipmentTypes['Башенный кран'].id, quantity: c.ago === 5 ? 1 : 2 },
        { resourceCheckId: check.id, equipmentTypeId: equipmentTypes['Автокран 25т'].id, quantity: 1 },
        { resourceCheckId: check.id, equipmentTypeId: equipmentTypes['Бетоносмеситель'].id, quantity: 2 },
        { resourceCheckId: check.id, equipmentTypeId: equipmentTypes['Автобетононасос'].id, quantity: 1 },
      ],
    });
  }

  // Проверки для дороги (7 дней)
  const roadChecksData = [
    { ago: 7, people: 28 },
    { ago: 6, people: 30 },
    { ago: 5, people: 27 },
    { ago: 4, people: 31 },
    { ago: 3, people: 29 },
    { ago: 2, people: 30 },
    { ago: 1, people: 32 },
  ];

  for (const c of roadChecksData) {
    const check = await prisma.resourceCheck.create({
      data: {
        stageId: roadStages[1].id,
        userId: inspector.id,
        date: dateOnly(daysAgo(c.ago)),
        checkedAt: daysAgo(c.ago),
        actualPeople: c.people,
      },
    });

    await prisma.equipmentCheck.createMany({
      data: [
        { resourceCheckId: check.id, equipmentTypeId: equipmentTypes['Экскаватор гусеничный'].id, quantity: 3 },
        { resourceCheckId: check.id, equipmentTypeId: equipmentTypes['Самосвал КАМАЗ'].id, quantity: c.people > 29 ? 8 : 6 },
        { resourceCheckId: check.id, equipmentTypeId: equipmentTypes['Бульдозер'].id, quantity: 2 },
        { resourceCheckId: check.id, equipmentTypeId: equipmentTypes['Каток дорожный'].id, quantity: 1 },
      ],
    });
  }

  console.log('Проверки ресурсов созданы');

  // === ПРОВЕРКИ ОБЪЁМОВ ===
  await prisma.volumeCheck.createMany({
    data: [
      { stageId: schoolStages[2].id, userId: technadzor.id, date: dateOnly(daysAgo(30)), percent: 30, comment: 'Монолитные работы 1-3 этажи завершены' },
      { stageId: schoolStages[2].id, userId: technadzor.id, date: dateOnly(daysAgo(14)), percent: 55, comment: 'Кладка наружных стен — 60%, внутренних — 40%' },
      { stageId: schoolStages[2].id, userId: technadzor.id, date: dateOnly(daysAgo(1)), percent: 70, comment: 'Каркас завершён на 70%, отставание от графика 5 дней' },
      { stageId: roadStages[1].id, userId: technadzor.id, date: dateOnly(daysAgo(20)), percent: 25, comment: 'Выемка грунта на участке км 45-50' },
      { stageId: roadStages[1].id, userId: technadzor.id, date: dateOnly(daysAgo(5)), percent: 50, comment: 'Насыпь на участке км 45-53 завершена, уплотнение' },
      { stageId: kgStages[3].id, userId: technadzor.id, date: dateOnly(daysAgo(20)), percent: 15, comment: 'Штукатурные работы 1 этаж' },
      { stageId: kgStages[3].id, userId: technadzor.id, date: dateOnly(daysAgo(5)), percent: 35, comment: 'Штукатурка завершена, начата покраска' },
    ],
  });

  console.log('Проверки объёмов созданы');

  // === ПЛАТЕЖИ ===
  await prisma.payment.createMany({
    data: [
      { stageId: schoolStages[0].id, userId: accountant.id, date: dateOnly(daysAgo(160)), amount: 12500000, comment: 'Аванс — подготовка площадки' },
      { stageId: schoolStages[0].id, userId: accountant.id, date: dateOnly(daysAgo(135)), amount: 12500000, comment: 'Окончательный расчёт — земляные работы' },
      { stageId: schoolStages[1].id, userId: accountant.id, date: dateOnly(daysAgo(130)), amount: 32500000, comment: 'Аванс — фундамент' },
      { stageId: schoolStages[1].id, userId: accountant.id, date: dateOnly(daysAgo(85)), amount: 32500000, comment: 'Окончательный расчёт — фундамент' },
      { stageId: schoolStages[2].id, userId: accountant.id, date: dateOnly(daysAgo(85)), amount: 40000000, comment: 'Аванс — каркас и стены' },
      { stageId: schoolStages[2].id, userId: accountant.id, date: dateOnly(daysAgo(30)), amount: 35000000, comment: 'Промежуточная оплата — каркас' },
      { stageId: kgStages[0].id, userId: accountant.id, date: dateOnly(daysAgo(280)), amount: 40000000, comment: 'Полная оплата — земляные работы' },
      { stageId: kgStages[1].id, userId: accountant.id, date: dateOnly(daysAgo(200)), amount: 40000000, comment: 'Аванс — каркас' },
      { stageId: kgStages[1].id, userId: accountant.id, date: dateOnly(daysAgo(125)), amount: 40000000, comment: 'Окончательный расчёт — каркас' },
      { stageId: kgStages[2].id, userId: accountant.id, date: dateOnly(daysAgo(100)), amount: 35000000, comment: 'Аванс — кровля и сети' },
      { stageId: kgStages[2].id, userId: accountant.id, date: dateOnly(daysAgo(25)), amount: 35000000, comment: 'Окончательный расчёт — кровля' },
      { stageId: kgStages[3].id, userId: accountant.id, date: dateOnly(daysAgo(25)), amount: 30000000, comment: 'Аванс — отделка' },
      { stageId: roadStages[0].id, userId: accountant.id, date: dateOnly(daysAgo(70)), amount: 45000000, comment: 'Полная оплата — подготовительные работы' },
      { stageId: roadStages[1].id, userId: accountant.id, date: dateOnly(daysAgo(40)), amount: 90000000, comment: 'Аванс — земляное полотно' },
    ],
  });

  console.log('Платежи созданы');

  // === ИЗМЕНЕНИЯ СРОКОВ ===
  await prisma.stageScheduleChange.createMany({
    data: [
      {
        stageId: schoolStages[2].id, userId: minister.id,
        oldStartDate: daysAgo(95), oldEndDate: daysFromNow(15),
        newStartDate: daysAgo(90), newEndDate: daysFromNow(30),
        reason: 'Задержка поставки арматуры из-за логистических проблем',
      },
      {
        stageId: kgStages[3].id, userId: minister.id,
        oldStartDate: daysAgo(45), oldEndDate: daysFromNow(40),
        newStartDate: daysAgo(30), newEndDate: daysFromNow(60),
        reason: 'Перенос начала отделки — ожидание полного высыхания штукатурки',
      },
    ],
  });

  console.log('История изменений сроков создана');

  // === ОБРАЩЕНИЯ ===
  const appeal1 = await prisma.appeal.create({
    data: {
      objectId: school.id, stageId: schoolStages[2].id, userId: contractorUser.id,
      type: AppealType.PROBLEM,
      subject: 'Задержка поставки оконных блоков',
      description: 'Поставщик оконных блоков уведомил о задержке партии на 2 недели. Просим рассмотреть возможность корректировки графика отделочных работ.',
      status: AppealStatus.IN_PROGRESS,
    },
  });

  await prisma.appealMessage.createMany({
    data: [
      { appealId: appeal1.id, userId: contractorUser.id, text: 'Поставщик ООО "ОкнаПласт" сообщил о задержке. Накладная №1847 от 15.03.2026. Ожидаемая дата поставки — 10.04.2026.' },
      { appealId: appeal1.id, userId: minister.id, text: 'Принято. Прошу технадзор оценить влияние на общий график.' },
      { appealId: appeal1.id, userId: technadzor.id, text: 'На текущий этап (каркас) не влияет. На отделку может повлиять, если задержка превысит 3 недели.' },
    ],
  });

  const appeal2 = await prisma.appeal.create({
    data: {
      objectId: road.id, stageId: roadStages[1].id, userId: contractorUser.id,
      type: AppealType.QUESTION,
      subject: 'Уточнение по проектной документации — участок км 55-58',
      description: 'В проектной документации на участке км 55-58 указана насыпь высотой 2.5м, но геодезическая съёмка показывает перепад 3.8м. Просим уточнить проектное решение.',
      status: AppealStatus.RESOLVED,
    },
  });

  await prisma.appealMessage.createMany({
    data: [
      { appealId: appeal2.id, userId: contractorUser.id, text: 'Прикладываем результаты геодезической съёмки. Расхождение с проектом существенное.' },
      { appealId: appeal2.id, userId: technadzor.id, text: 'Подтверждаю расхождение. Направил запрос проектировщику.' },
      { appealId: appeal2.id, userId: technadzor.id, text: 'Получен скорректированный проект. Насыпь 3.2м с дополнительным армированием геотекстилем. Дополнительное соглашение на 4.2 млн руб.' },
      { appealId: appeal2.id, userId: minister.id, text: 'Согласовано. Оформляйте допсоглашение.' },
    ],
  });

  const appeal3 = await prisma.appeal.create({
    data: {
      objectId: apartment.id, userId: contractorUser.id,
      type: AppealType.PROBLEM,
      subject: 'Приостановка работ — проблемы с финансированием',
      description: 'В связи с задержкой оплаты по актам КС-2 за октябрь-ноябрь 2025 вынуждены приостановить работы на объекте.',
      status: AppealStatus.NEW,
    },
  });

  await prisma.appealMessage.create({
    data: {
      appealId: appeal3.id, userId: contractorUser.id,
      text: 'Задолженность по актам КС-2 №14 и №15 составляет 28.4 млн руб. Просим рассмотреть вопрос в кратчайшие сроки.',
    },
  });

  const appeal4 = await prisma.appeal.create({
    data: {
      objectId: kindergarten.id, stageId: kgStages[3].id, userId: inspector.id,
      type: AppealType.SUGGESTION,
      subject: 'Предложение по ускорению отделочных работ',
      description: 'Предлагаю привлечь дополнительную бригаду отделочников для параллельного выполнения работ на 1 и 2 этажах.',
      status: AppealStatus.RESOLVED,
    },
  });

  await prisma.appealMessage.createMany({
    data: [
      { appealId: appeal4.id, userId: minister.id, text: 'Согласен. Прошу подрядчика подготовить смету на дополнительную бригаду.' },
      { appealId: appeal4.id, userId: contractorUser.id, text: 'Смета подготовлена. Дополнительная бригада 12 человек, стоимость 1.8 млн руб/мес. Срок сокращается на 3 недели.' },
      { appealId: appeal4.id, userId: minister.id, text: 'Утверждаю. Приступайте.' },
    ],
  });

  console.log('Обращения созданы');

  // === ПРИВЯЗКА ПОЛЬЗОВАТЕЛЕЙ К ОБЪЕКТАМ ===
  await prisma.userObjectAssignment.createMany({
    data: [
      { userId: inspector.id, objectId: school.id },
      { userId: inspector.id, objectId: kindergarten.id },
      { userId: inspector.id, objectId: road.id },
      { userId: technadzor.id, objectId: school.id },
      { userId: technadzor.id, objectId: kindergarten.id },
      { userId: technadzor.id, objectId: road.id },
      { userId: technadzor.id, objectId: apartment.id },
      { userId: contractorUser.id, objectId: school.id },
      { userId: contractorUser.id, objectId: road.id },
      { userId: contractorUser.id, objectId: apartment.id },
      { userId: accountant.id, objectId: school.id },
      { userId: accountant.id, objectId: kindergarten.id },
      { userId: accountant.id, objectId: road.id },
    ],
  });

  console.log('Привязки пользователей к объектам созданы');

  console.log('\n========================================');
  console.log('=== ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ УСПЕШНО ===');
  console.log('========================================');
  console.log('\nДанные для входа:');
  console.log('Суперадмин:    admin@build-control.ru / admin123');
  console.log('Министр:       minister@kchr.ru / minister123');
  console.log('Правительство: government@kchr.ru / gov123');
  console.log('Бухгалтер:     accountant@kchr.ru / acc123');
  console.log('Технадзор:     technadzor@kchr.ru / tech123');
  console.log('Проверяющий:   inspector@kchr.ru / insp123');
  console.log('Подрядчик:     contractor@kchr.ru / contr123');
  console.log('\nОбъекты:');
  console.log('1. Школа на 500 мест — в работе (45%)');
  console.log('2. Детский сад на 220 мест — в работе (72%)');
  console.log('3. Автодорога Черкесск-Домбай — в работе (30%)');
  console.log('4. Поликлиника — запланирована');
  console.log('5. Спорткомплекс — завершён');
  console.log('6. МКД 72 квартиры — приостановлен');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
