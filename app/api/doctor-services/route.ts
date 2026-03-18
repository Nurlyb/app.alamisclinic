/**
 * API для услуг докторов (операций)
 * GET - получить все услуги
 * POST - создать новую услугу (только владелец)
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

const createDoctorServiceSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  departmentIds: z.array(z.string()).min(1, 'Выберите хотя бы одно отделение'),
});

// GET - получить все активные услуги докторов
export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const departmentId = searchParams.get('departmentId');

      const where: any = {
        isActive: true,
      };

      // Если указан departmentId, фильтруем по отделениям
      if (departmentId) {
        where.departments = {
          some: {
            departmentId: departmentId,
          },
        };
      }

      const services = await prisma.doctorService.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          assignments: {
            select: {
              id: true,
              status: true,
            },
          },
          departments: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return successResponse({ services });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own'] // Доктора и ассистенты могут видеть
);

// POST - создать новую услугу (только владелец)
export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createDoctorServiceSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const { name, description, departmentIds } = validation.data;

      const service = await prisma.doctorService.create({
        data: {
          name,
          description,
          createdBy: user.userId,
          departments: {
            create: departmentIds.map(departmentId => ({
              departmentId,
            })),
          },
        },
        include: {
          departments: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return successResponse({ service }, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'services:manage' // Владелец имеет это право
);
