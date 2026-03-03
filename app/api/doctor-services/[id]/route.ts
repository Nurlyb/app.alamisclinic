import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit/logger';

const prisma = new PrismaClient();

// PATCH /api/doctor-services/[id] - Обновить услугу доктора
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const existing = await prisma.doctorService.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Doctor service not found' }, { status: 404 });
    }

    // Проверка прав: доктор может редактировать только свои услуги
    if (
      user.role === 'DOCTOR' &&
      existing.doctorId !== user.id &&
      !hasPermission(user.role, 'services:manage')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.doctorService.update({
      where: { id },
      data: {
        customPrice: body.customPrice ? parseFloat(body.customPrice) : null,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
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
      action: 'UPDATE',
      tableName: 'doctor_services',
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating doctor service:', error);
    return NextResponse.json(
      { error: 'Failed to update doctor service' },
      { status: 500 }
    );
  }
}

// DELETE /api/doctor-services/[id] - Удалить услугу доктора
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const existing = await prisma.doctorService.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Doctor service not found' }, { status: 404 });
    }

    // Проверка прав
    if (
      user.role === 'DOCTOR' &&
      existing.doctorId !== user.id &&
      !hasPermission(user.role, 'services:manage')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.doctorService.delete({
      where: { id },
    });

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      tableName: 'doctor_services',
      recordId: id,
      oldValue: existing,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting doctor service:', error);
    return NextResponse.json(
      { error: 'Failed to delete doctor service' },
      { status: 500 }
    );
  }
}
