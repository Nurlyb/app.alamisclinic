import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Создание 30 записей на завтра...');

  // Получаем завтрашнюю дату
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Получаем всех пациентов, докторов, услуги, отделения и оператора
  const patients = await prisma.patient.findMany({ take: 30 });
  const doctors = await prisma.user.findMany({ where: { role: 'DOCTOR' } });
  const services = await prisma.service.findMany({ where: { isActive: true } });
  const departments = await prisma.department.findMany({ where: { isActive: true } });
  const operator = await prisma.user.findFirst({ where: { role: 'OPERATOR' } });

  if (!operator) {
    throw new Error('Оператор не найден');
  }

  if (patients.length === 0 || doctors.length === 0 || services.length === 0) {
    throw new Error('Недостаточно данных для создания записей');
  }

  // Временные слоты с 8:00 до 20:00
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  const statuses = ['PENDING', 'CONFIRMED'];
  const visitTypes = ['PRIMARY', 'REPEAT'];

  // Создаем 30 записей
  for (let i = 0; i < 30; i++) {
    const patient = patients[i % patients.length];
    const doctor = doctors[i % doctors.length];
    const service = services[i % services.length];
    const department = departments[i % departments.length];
    const timeSlot = timeSlots[i % timeSlots.length];

    const [hours, minutes] = timeSlot.split(':').map(Number);
    const appointmentDate = new Date(tomorrow);
    appointmentDate.setHours(hours, minutes, 0, 0);

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        serviceId: service.id,
        departmentId: department.id,
        datetime: appointmentDate,
        status: statuses[i % statuses.length] as any,
        type: visitTypes[i % visitTypes.length] as any,
        managerId: operator.id,
        prepayment: 0,
        finalPayment: 0,
      },
    });

    console.log(`✅ Запись ${i + 1}/30 создана: ${patient.fullName} к ${doctor.name} в ${timeSlot}`);
  }

  console.log('🎉 Все 30 записей успешно созданы!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
