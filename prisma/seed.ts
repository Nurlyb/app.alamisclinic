/**
 * Seed данные для Clinic Management System
 * Создаёт тестовые данные для всех сущностей
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // Очистка базы данных
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.salaryPayment.deleteMany();
  await prisma.salaryAccrual.deleteMany();
  await prisma.salaryScheme.deleteMany();
  await prisma.patientFile.deleteMany();
  await prisma.recordTemplate.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.direction.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.department.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ База данных очищена');

  // Хеш пароля для всех пользователей (password: "clinic123")
  const passwordHash = await bcrypt.hash('clinic123', 10);

  // 1. Создание пользователей
  const owner = await prisma.user.create({
    data: {
      name: 'Владимир Петров',
      role: 'OWNER',
      colorBadge: '#8B5CF6',
      phone: '+77001234567',
      passwordHash,
      isActive: true,
    },
  });

  const operator1 = await prisma.user.create({
    data: {
      name: 'Анна Смирнова',
      role: 'OPERATOR',
      colorBadge: '#3B82F6',
      phone: '+77001234568',
      passwordHash,
      isActive: true,
    },
  });

  const receptionist1 = await prisma.user.create({
    data: {
      name: 'Мария Иванова',
      role: 'RECEPTIONIST',
      colorBadge: '#10B981',
      phone: '+77001234569',
      passwordHash,
      isActive: true,
    },
  });

  const assistant1 = await prisma.user.create({
    data: {
      name: 'Елена Козлова',
      role: 'ASSISTANT',
      colorBadge: '#F59E0B',
      phone: '+77001234570',
      passwordHash,
      isActive: true,
    },
  });

  console.log('✅ Пользователи созданы');

  // 2. Создание отделений
  const proctology = await prisma.department.create({
    data: { name: 'Проктология', isActive: true },
  });

  const urology = await prisma.department.create({
    data: { name: 'Урология', isActive: true },
  });

  const orthopedics = await prisma.department.create({
    data: { name: 'Ортопедия', isActive: true },
  });

  const cardiology = await prisma.department.create({
    data: { name: 'Кардиология', isActive: true },
  });

  const laboratory = await prisma.department.create({
    data: { name: 'Анализы и Чекап', isActive: true },
  });

  const procedures = await prisma.department.create({
    data: { name: 'Процедуры', isActive: true },
  });

  console.log('✅ Отделения созданы');

  // 3. Создание подкатегорий услуг
  const categories = [];
  const departments = [proctology, urology, orthopedics, cardiology, laboratory, procedures];

  for (const dept of departments) {
    const consultation = await prisma.serviceCategory.create({
      data: { name: 'Консультации', departmentId: dept.id },
    });
    const diagnostics = await prisma.serviceCategory.create({
      data: { name: 'Диагностика', departmentId: dept.id },
    });
    const treatment = await prisma.serviceCategory.create({
      data: { name: 'Лечение', departmentId: dept.id },
    });
    const operations = await prisma.serviceCategory.create({
      data: { name: 'Операции', departmentId: dept.id },
    });
    const additional = await prisma.serviceCategory.create({
      data: { name: 'Доп. услуги', departmentId: dept.id },
    });

    categories.push({ dept, consultation, diagnostics, treatment, operations, additional });
  }

  console.log('✅ Подкатегории услуг созданы');

  // 4. Создание услуг (примеры для проктологии)
  const proctoCat = categories[0];
  await prisma.service.createMany({
    data: [
      {
        code: 'N001',
        name: 'Первичная консультация проктолога',
        price: 7000,
        categoryId: proctoCat.consultation.id,
        departmentId: proctology.id,
        durationMin: 30,
        isActive: true,
      },
      {
        code: 'N002',
        name: 'Повторная консультация проктолога',
        price: 5000,
        categoryId: proctoCat.consultation.id,
        departmentId: proctology.id,
        durationMin: 20,
        isActive: true,
      },
      {
        code: 'N003',
        name: 'Аноскопия',
        price: 3500,
        categoryId: proctoCat.diagnostics.id,
        departmentId: proctology.id,
        durationMin: 15,
        isActive: true,
      },
      {
        code: 'N004',
        name: 'Ректороманоскопия',
        price: 8000,
        categoryId: proctoCat.diagnostics.id,
        departmentId: proctology.id,
        durationMin: 30,
        isActive: true,
      },
      {
        code: 'N005',
        name: 'Лечение геморроя (консервативное)',
        price: 15000,
        categoryId: proctoCat.treatment.id,
        departmentId: proctology.id,
        durationMin: 45,
        isActive: true,
      },
      {
        code: 'N006',
        name: 'Удаление геморроидальных узлов',
        price: 85000,
        categoryId: proctoCat.operations.id,
        departmentId: proctology.id,
        durationMin: 120,
        isActive: true,
      },
    ],
  });

  // Услуги для урологии
  const uroCat = categories[1];
  await prisma.service.createMany({
    data: [
      {
        code: 'U001',
        name: 'Консультация уролога',
        price: 6500,
        categoryId: uroCat.consultation.id,
        departmentId: urology.id,
        durationMin: 30,
        isActive: true,
      },
      {
        code: 'U002',
        name: 'УЗИ мочевого пузыря',
        price: 4500,
        categoryId: uroCat.diagnostics.id,
        departmentId: urology.id,
        durationMin: 20,
        isActive: true,
      },
      {
        code: 'U003',
        name: 'Цистоскопия',
        price: 12000,
        categoryId: uroCat.diagnostics.id,
        departmentId: urology.id,
        durationMin: 40,
        isActive: true,
      },
    ],
  });

  console.log('✅ Услуги созданы');

  // 5. Создание докторов
  const doctor1 = await prisma.user.create({
    data: {
      name: 'Ван Инь Ся',
      role: 'DOCTOR',
      departmentId: proctology.id,
      colorBadge: '#EF4444',
      phone: '+77001234571',
      passwordHash,
      isActive: true,
    },
  });

  const doctor2 = await prisma.user.create({
    data: {
      name: 'Нурузова Зарина',
      role: 'DOCTOR',
      departmentId: urology.id,
      colorBadge: '#06B6D4',
      phone: '+77001234572',
      passwordHash,
      isActive: true,
    },
  });

  const doctor3 = await prisma.user.create({
    data: {
      name: 'Алексей Петров',
      role: 'DOCTOR',
      departmentId: cardiology.id,
      colorBadge: '#8B5CF6',
      phone: '+77001234573',
      passwordHash,
      isActive: true,
    },
  });

  console.log('✅ Доктора созданы');

  // Привязываем ассистента к доктору
  await prisma.user.update({
    where: { id: assistant1.id },
    data: { assistingDoctorId: doctor1.id },
  });

  console.log('✅ Ассистент привязан к доктору');

  // 6. Создание схем зарплат для докторов
  await prisma.salaryScheme.createMany({
    data: [
      {
        doctorId: doctor1.id,
        type: 'PERCENT',
        baseSalary: 0,
        primaryPercent: 25,
        repeatPercent: 30,
        operationPercent: 20,
        effectiveFrom: new Date('2026-01-01'),
      },
      {
        doctorId: doctor2.id,
        type: 'PERCENT',
        baseSalary: 0,
        primaryPercent: 20,
        repeatPercent: 25,
        operationPercent: 15,
        effectiveFrom: new Date('2026-01-01'),
      },
      {
        doctorId: doctor3.id,
        type: 'MIXED',
        baseSalary: 150000,
        primaryPercent: 15,
        repeatPercent: 20,
        operationPercent: 10,
        effectiveFrom: new Date('2026-01-01'),
      },
    ],
  });

  console.log('✅ Схемы зарплат созданы');

  // 7. Создание пациентов
  const patient1 = await prisma.patient.create({
    data: {
      fullName: 'Иванов Иван Иванович',
      iin: '900101300123',
      dob: new Date('1990-01-01'),
      gender: 'MALE',
      phone: '+77012345678',
      address: 'г. Алматы, ул. Абая 150',
      source: 'INSTAGRAM',
      blacklist: false,
      noShowCount: 0,
      debt: 0,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      fullName: 'Петрова Мария Сергеевна',
      iin: '850505400234',
      dob: new Date('1985-05-05'),
      gender: 'FEMALE',
      phone: '+77012345679',
      address: 'г. Алматы, ул. Сатпаева 22',
      source: 'GIS',
      blacklist: false,
      noShowCount: 0,
      debt: 0,
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      fullName: 'Сидоров Петр Александрович',
      iin: '920303500345',
      dob: new Date('1992-03-03'),
      gender: 'MALE',
      phone: '+77012345680',
      address: 'г. Алматы, мкр. Самал-2, д. 111',
      source: 'REFERRAL',
      blacklist: true,
      blacklistReason: 'Не явился на приём 3 раза подряд',
      noShowCount: 3,
      debt: 0,
    },
  });

  console.log('✅ Пациенты созданы');

  // 8. Создание записей на приём
  const services = await prisma.service.findMany();
  const service1 = services[0]; // Первичная консультация проктолога

  const appointment1 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor1.id,
      serviceId: service1.id,
      departmentId: proctology.id,
      datetime: new Date('2026-02-26T10:00:00'),
      status: 'CONFIRMED',
      type: 'PRIMARY',
      comment: 'Жалобы на боли',
      managerId: operator1.id,
      prepayment: 0,
      finalPayment: 0,
    },
  });

  const appointment2 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: doctor1.id,
      serviceId: service1.id,
      departmentId: proctology.id,
      datetime: new Date('2026-02-26T11:00:00'),
      status: 'ARRIVED',
      type: 'PRIMARY',
      comment: 'Первичный осмотр',
      managerId: operator1.id,
      prepayment: 3000,
      finalPayment: 0,
      arrivedAt: new Date(),
    },
  });

  console.log('✅ Записи на приём созданы');

  // 9. Создание шаблонов осмотров
  await prisma.recordTemplate.create({
    data: {
      doctorId: doctor1.id,
      name: 'Стандартный осмотр проктолога',
      diagnosis: 'Геморрой 1 степени',
      icd10: 'K64.0',
      prescription: 'Релиф свечи 2 раза в день, 10 дней',
      notes: 'Рекомендована диета, исключить острое и алкоголь',
      vitals: {
        weight: 0,
        height: 0,
        bloodPressure: '',
        temperature: 0,
        complaints: '',
      },
    },
  });

  console.log('✅ Шаблоны осмотров созданы');

  console.log('🎉 Заполнение базы данных завершено!');
  console.log('\n📋 Тестовые учётные данные:');
  console.log('   Email: любой (используйте phone)');
  console.log('   Пароль: clinic123');
  console.log('\n👥 Пользователи:');
  console.log(`   Владелец: ${owner.name} (${owner.phone})`);
  console.log(`   Оператор: ${operator1.name} (${operator1.phone})`);
  console.log(`   Ресепшн: ${receptionist1.name} (${receptionist1.phone})`);
  console.log(`   Ассистент: ${assistant1.name} (${assistant1.phone})`);
  console.log(`   Доктор 1: ${doctor1.name} (${doctor1.phone})`);
  console.log(`   Доктор 2: ${doctor2.name} (${doctor2.phone})`);
  console.log(`   Доктор 3: ${doctor3.name} (${doctor3.phone})`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
