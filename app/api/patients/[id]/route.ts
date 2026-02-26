/**
 * GET /api/patients/[id] - Получение пациента
 * PUT /api/patients/[id] - Обновление пациента
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { extractIdFromUrl } from '@/lib/utils/url';
import { prisma } from '@/lib/db/prisma';
import { updatePatientSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logUpdate } from '@/lib/audit/logger';

// GET - Получение пациента
export const GET = withAuth(
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const id = extractIdFromUrl(request.url);

      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          appointments: {
            include: {
              doctor: {
                select: {
                  name: true,
                },
              },
              service: {
                select: {
                  name: true,
                  price: true,
                },
              },
              payment: true,
            },
            orderBy: {
              datetime: 'desc',
            },
          },
          files: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          medicalRecords: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!patient) {
        return notFoundResponse('Пациент');
      }

      return successResponse(patient);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'patients:view'
);

// PUT - Обновление пациента
export const PUT = withAuth(
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const id = extractIdFromUrl(request.url);
      const body = await request.json();
      const validation = updatePatientSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      const existingPatient = await prisma.patient.findUnique({
        where: { id },
      });

      if (!existingPatient) {
        return notFoundResponse('Пациент');
      }

      const updatedPatient = await prisma.patient.update({
        where: { id },
        data: {
          ...(data.fullName && { fullName: data.fullName }),
          ...(data.dob && { dob: new Date(data.dob) }),
          ...(data.gender && { gender: data.gender }),
          ...(data.phone && { phone: data.phone }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.source && { source: data.source }),
        },
      });

      await logUpdate(
        user.userId,
        'patients',
        id,
        existingPatient,
        updatedPatient,
        request.headers.get('x-forwarded-for') || undefined
      );

      return successResponse(updatedPatient);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'patients:update'
);
