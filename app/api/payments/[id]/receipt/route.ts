/**
 * GET /api/payments/[id]/receipt - Получение PDF чека
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { JWTPayload } from '@/lib/auth/jwt';
import { extractIdFromUrl } from '@/lib/utils/url';
import { generateReceiptPDF, ReceiptData } from '@/lib/pdf/receipt';
import { uploadReceiptPDF } from '@/lib/storage/s3';
import {
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const GET = withAuth(
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const id = extractIdFromUrl(request.url);
      const { searchParams } = new URL(request.url);
      const width = searchParams.get('width') === '58' ? 58 : 80;
      const download = searchParams.get('download') === 'true';

      // Получение оплаты с полными данными
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          appointment: {
            include: {
              patient: true,
              doctor: {
                select: {
                  name: true,
                },
              },
              service: true,
              department: {
                select: {
                  name: true,
                },
              },
              direction: {
                include: {
                  fromDoctor: {
                    select: {
                      name: true,
                      departmentId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return notFoundResponse('Оплата');
      }

      // Проверка прав доступа
      if (
        user.role === 'DOCTOR' &&
        payment.appointment.doctorId !== user.userId
      ) {
        return NextResponse.json(
          { error: 'Нет доступа к этому чеку', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      // Если PDF уже существует, возвращаем его
      if (payment.receiptPdfUrl && !download) {
        return NextResponse.json({
          success: true,
          url: payment.receiptPdfUrl,
        });
      }

      // Получение регистратора
      const registrar = await prisma.user.findUnique({
        where: { id: payment.receivedBy },
        select: { name: true },
      });

      // Получение направления (если есть)
      const direction = payment.appointment.direction;
      let directionNumber = 1;

      if (direction) {
        directionNumber = direction.number;
      } else {
        // Создаём направление если его нет
        const newDirection = await prisma.direction.create({
          data: {
            appointmentId: payment.appointmentId,
            toDoctorId: payment.appointment.doctorId,
            patientId: payment.appointment.patientId,
            serviceId: payment.appointment.serviceId,
            status: 'DONE',
          },
        });
        directionNumber = newDirection.number;
      }

      // Получение информации о направлении (если был направлен)
      let referredFrom;
      if (direction?.fromDoctor) {
        const fromDepartment = await prisma.department.findUnique({
          where: { id: direction.fromDoctor.departmentId! },
          select: { name: true },
        });

        referredFrom = {
          department: fromDepartment?.name || 'Неизвестно',
          doctor: direction.fromDoctor.name,
        };
      }

      // Формирование данных для чека
      const receiptData: ReceiptData = {
        directionNumber,
        status: 'ОПЛАЧЕНО',
        registrar: registrar?.name || 'Неизвестно',
        datetime: payment.createdAt,
        patient: {
          fullName: payment.appointment.patient.fullName,
          iin: payment.appointment.patient.iin,
        },
        department: payment.appointment.department.name,
        doctor: payment.appointment.doctor.name,
        referredFrom,
        services: [
          {
            code: payment.appointment.service.code,
            name: payment.appointment.service.name,
            quantity: 1,
            price: Number(payment.appointment.service.price),
          },
        ],
        payment: {
          total: Number(payment.amount),
          cash: Number(payment.cash),
          cashless: Number(payment.cashless),
          change: Number(payment.change),
        },
        receiptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/receipt/${directionNumber}`,
      };

      // Генерация PDF
      const pdfBuffer = await generateReceiptPDF(receiptData, width);

      // Загрузка в S3
      const pdfUrl = await uploadReceiptPDF(pdfBuffer, directionNumber);

      // Сохранение URL в базе
      await prisma.payment.update({
        where: { id },
        data: { receiptPdfUrl: pdfUrl },
      });

      // Обновление направления
      if (direction) {
        await prisma.direction.update({
          where: { id: direction.id },
          data: {
            pdfUrl,
            printedAt: new Date(),
          },
        });
      }

      // Возврат PDF
      if (download) {
        return new NextResponse(pdfBuffer as unknown as BodyInit, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="receipt-${directionNumber}.pdf"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        url: pdfUrl,
        directionNumber,
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['payments:receipt', 'payments:view:all', 'payments:view:own']
);
