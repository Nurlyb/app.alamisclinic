/**
 * Скрипт для создания 30 записей на завтра к врачам
 * Запуск: npx ts-node scripts/seed-appointments.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Начинаем создание 30 записей на завтра...\n');

  // Получаем завтрашнюю дату
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Получаем всех активных врачей
  const doctors = await prisma.user.findMany({
    where: {
      role: 'DOCTOR',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (doctors.length === 0) {
    console.error('❌ Не найдено активных врачей в системе');
    return;
  }

  console.log(`✅ Найдено врачей: ${doctors.length}`);

  // Получаем всех пациентов
  const patients = await prisma.patient.findMany({
    where: {
      blacklist: false,
    },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (patients.length === 0) {
    console.error('❌ Не найдено пациентов в системе');
    return;
  }

  console.log(`✅ Найдено пациентов: ${patients.length}`);

  // Получаем все активные услуги
  const services = await prisma.service.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      departmentId: true,
      durationMin: true,
    },
  });

  if (services.length === 0) {
    console.error('❌ Не найдено активных услуг в системе');
    return;
  }

  console.log(`✅ Найдено услуг: ${services.length}`);

  // Получаем первого оператора для managerId
  const operator = await prisma.user.findFirst({
    where: {
      role: { in: ['OPERATOR', 'RECEPTIONIST'] },
      isActive: true,
    },
  });

  if (!operator) {
    console.error('❌ Не найдено активных операторов в системе');
    return;
  }

  console.log(`✅ Оператор: ${operator.name}\n`);

  // Создаем 30 записей
  const appointments = [];
  const startHour = 9; // Начало рабочего дня
  const appointmentsPerDoctor = Math.ceil(30 / doctors.length);

  let appointmentCount = 0;

  for (let i = 0; i < doctors.length && appointmentCount < 30; i++) {
    const doctor = doctors[i];
    
    for (let j = 0; j < appointmentsPerDoctor && appointmentCount < 30; j++) {
      // Случайный пациент
      const patient = patients[Math.floor(Math.random() * patients.length)];
      
      // Случайная услуга
      const service = services[Math.floor(Math.random() * services.length)];
      
      // Время записи (каждые 30 минут)
      const appointmentTime = new Date(tomorrow);
      const totalMinutes = (startHour * 60) + (j * 30);
      appointmentTime.setHours(Math.floor(totalMinutes / 60));
      appointmentTime.setMinutes(totalMinutes % 60);
      appointmentTime.setSeconds(0);
      appointmentTime.setMilliseconds(0);

      // Проверяем, нет ли уже записи на это время
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          datetime: appointmentTime,
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
        },
      });

      if (existingAppointment) {
        console.log(`⚠️  Пропускаем: ${doctor.name} уже занят в ${appointmentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`);
        continue;
      }

      try {
        const appointment = await prisma.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            serviceId: service.id,
            departmentId: service.departmentId,
            datetime: appointmentTime,
            type: 'PRIMARY',
            status: 'CONFIRMED',
            managerId: operator.id,
            prepayment: 0,
            finalPayment: 0,
            comment: 'Автоматически созданная запись',
          },
          include: {
            patient: {
              select: {
                fullName: true,
              },
            },
            doctor: {
              select: {
                name: true,
              },
            },
            service: {
              select: {
                name: true,
              },
            },
          },
        });

        appointments.push(appointment);
        appointmentCount++;

        console.log(
          `✅ Запись ${appointmentCount}/30: ${appointment.patient.fullName} → ${appointment.doctor.name} (${appointment.service.name}) в ${appointmentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
        );
      } catch (error) {
        console.error(`❌ Ошибка создания записи: ${error}`);
      }
    }
  }

  console.log(`\n🎉 Успешно создано записей: ${appointments.length}`);
  console.log(`📅 Дата: ${tomorrow.toLocaleDateString('ru-RU')}`);
}

main()
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
