import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit/logger';

const prisma = new PrismaClient();

// GET /api/doctor-services - Получить услуги доктора
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    // Доктор может видеть только свои услуги, ассистент - услуги своего доктора
    let targetDoctorId = doctorId;
    
    if (user.role === 'ASSISTANT' && user.assistingDoctorId) {
      targetDoctorId = user.assistingDoctorId;
    } else if (user.role === 'DOCTOR') {
      targetDoctorId = user.id;
    } else if (!hasPermission(user.role, 'services:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!targetDoctorId) {
      return NextResponse.json({ error: 'Doctor ID required' }, { status: 400 });
    }

    const doctorServices = await prisma.doctorService.findMany({
      where: {
        doctorId: targetDoctorId,
        isActive: true,
      },
      include: {
        service: {
          include: {
            category: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: doctorServices });
  } catch (error) {
    console.error('Error fetching doctor services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctor services' },
      { status: 500 }
    );
  }
}

// POST /api/doctor-services - Создать услугу доктора
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Только доктор может создавать свои услуги или владелец
    if (user.role !== 'DOCTOR' && !hasPermission(user.role, 'services:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { serviceId, customPrice } = body;

    const doctorId = user.role === 'DOCTOR' ? user.id : body.doctorId;

    if (!doctorId || !serviceId) {
      return NextResponse.json(
        { error: 'Doctor ID and Service ID required' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли уже такая услуга у доктора
    const existing = await prisma.doctorService.findUnique({
      where: {
        doctorId_serviceId: {
          doctorId,
          serviceId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Service already exists for this doctor' },
        { status: 400 }
      );
    }

    const doctorService = await prisma.doctorService.create({
      data: {
        doctorId,
        serviceId,
        customPrice: customPrice ? parseFloat(customPrice) : null,
      },
      include: {
        service: {
          include: {
            category: true,
            department: true,
          },
        },
      },
    });

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      tableName: 'doctor_services',
      recordId: doctorService.id,
      newValue: doctorService,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({ success: true, data: doctorService });
  } catch (error) {
    console.error('Error creating doctor service:', error);
    return NextResponse.json(
      { error: 'Failed to create doctor service' },
      { status: 500 }
    );
  }
}
