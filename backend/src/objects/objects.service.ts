import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObjectDto } from './dto/create-object.dto';
import { UpdateObjectDto } from './dto/update-object.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ObjectsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateObjectDto) {
    return this.prisma.object.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        contractorId: dto.contractorId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget,
        status: dto.status,
      },
      include: {
        contractor: true,
        stages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async findAll(tenantId: string, userId: string, userRole: Role) {
    let whereClause: any = { tenantId };

    // Подрядчик видит только свои объекты
    if (userRole === Role.CONTRACTOR) {
      const assignments = await this.prisma.userObjectAssignment.findMany({
        where: { userId },
        select: { objectId: true },
      });
      const objectIds = assignments.map((a) => a.objectId);
      whereClause = { tenantId, id: { in: objectIds } };
    }

    const objects = await this.prisma.object.findMany({
      where: whereClause,
      include: {
        contractor: true,
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            volumeChecks: {
              orderBy: { date: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Добавляем расчёт прогресса для каждого объекта
    return objects.map((obj) => {
      const stages = obj.stages;
      let progress = 0;
      if (stages.length > 0) {
        const totalProgress = stages.reduce((sum, stage) => {
          const lastCheck = stage.volumeChecks?.[0];
          return sum + (lastCheck?.percent || 0);
        }, 0);
        progress = Math.round(totalProgress / stages.length);
      }
      return { ...obj, progress };
    });
  }

  async findOne(id: string, tenantId: string) {
    const object = await this.prisma.object.findFirst({
      where: { id, tenantId },
      include: {
        contractor: true,
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            plannedEquipment: {
              include: { equipmentType: true },
            },
          },
        },
      },
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    return object;
  }

  async update(id: string, tenantId: string, dto: UpdateObjectDto) {
    await this.findOne(id, tenantId);

    return this.prisma.object.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        contractorId: dto.contractorId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget,
        status: dto.status,
      },
      include: {
        contractor: true,
        stages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.object.delete({
      where: { id },
    });
  }

  // Расчёт прогресса объекта на основе проверок объёмов
  async calculateProgress(id: string, tenantId: string) {
    const object = await this.prisma.object.findFirst({
      where: { id, tenantId },
      include: {
        stages: {
          include: {
            volumeChecks: {
              orderBy: { date: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    const stages = object.stages;
    if (stages.length === 0) return 0;

    // Средний прогресс по всем этапам
    const totalProgress = stages.reduce((sum, stage) => {
      const lastCheck = stage.volumeChecks[0];
      return sum + (lastCheck?.percent || 0);
    }, 0);

    return Math.round(totalProgress / stages.length);
  }
}
