/**
 * PATCH /api/patients/[id]/blacklist - Добавление/удаление из чёрного списка
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { JWTPayload } from '@/lib/auth/jwt';
import { extractIdFromUrl } from '@/lib/utils/url';
import { blacklistPatientSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logUpdate } from '@/lib/audit/logger';

export const PATCH = withAuth(
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const id = extractIdFromUrl(request.url);
      const body = await request.json();
      const validation = blacklistPatientSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const { blacklist, reason } = validation.data;

      const existingPatient = await prisma.patient.findUnique({
        where: { id },
      });

      if (!existingPatient) {
        return notFoundResponse('Пациент');
      }

      const updatedPatient = await prisma.patient.update({
        where: { id },
        data: {
          blacklist,
          blacklistReason: blacklist ? reason : null,
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

      return successResponse({
        message: blacklist ? 'Пациент добавлен в чёрный список' : 'Пациент удалён из чёрного списка',
        patient: updatedPatient,
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'patients:blacklist'
);
