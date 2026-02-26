/**
 * GET /api/patients - Получение списка пациентов
 * POST /api/patients - Создание нового пациента
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { createPatientSchema, patientQuerySchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  paginatedResponse,
  internalErrorResponse,
  errorResponse,
} from '@/lib/utils/response';
import { logCreate } from '@/lib/audit/logger';

// GET - Получение списка пациентов
export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryValidation = patientQuerySchema.safeParse({
        search: searchParams.get('search') || undefined,
        blacklist: searchParams.get('blacklist') || undefined,
        source: searchParams.get('source') || undefined,
        page: searchParams.get('page') || '1',
        limit: searchParams.get('limit') || '50',
      });

      if (!queryValidation.success) {
        return validationErrorResponse(queryValidation.error);
      }

      const { search, blacklist, source, page, limit } = queryValidation.data;
      const pageNum = parseInt(page || '1');
      const limitNum = parseInt(limit || '50');
      const skip = (pageNum - 1) * limitNum;

      // Построение фильтров
      const where: any = {};

      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { iin: { contains: search } },
        ];
      }

      if (blacklist) {
        where.blacklist = blacklist === 'true';
      }

      if (source) {
        where.source = source;
      }

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            iin: true,
            dob: true,
            gender: true,
            phone: true,
            address: true,
            source: true,
            blacklist: true,
            blacklistReason: true,
            noShowCount: true,
            debt: true,
            createdAt: true,
          },
        }),
        prisma.patient.count({ where }),
      ]);

      return paginatedResponse(patients, total, pageNum, limitNum);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'patients:view'
);

// POST - Создание нового пациента
export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createPatientSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      // Проверка на дубликат ИИН (только если ИИН указан)
      if (data.iin) {
        const existingPatient = await prisma.patient.findUnique({
          where: { iin: data.iin },
        });

        if (existingPatient) {
          return errorResponse('Пациент с таким ИИН уже существует', 'DUPLICATE_IIN', 409);
        }
      }

      // Создание пациента
      const patientData: any = {
        fullName: data.fullName,
        phone: data.phone,
        source: data.source,
      };

      // Добавляем опциональные поля только если они указаны
      if (data.iin) patientData.iin = data.iin;
      if (data.dob) patientData.dob = new Date(data.dob);
      if (data.gender) patientData.gender = data.gender;
      if (data.address) patientData.address = data.address;

      const patient = await prisma.patient.create({
        data: patientData,
      });

      // Логирование
      await logCreate(
        user.userId,
        'patients',
        patient.id,
        patient,
        request.headers.get('x-forwarded-for') || undefined
      );

      return successResponse(patient, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'patients:create'
);
