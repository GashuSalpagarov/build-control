import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObjectDto } from './dto/create-object.dto';
import { UpdateObjectDto } from './dto/update-object.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ObjectsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string | null, dto: CreateObjectDto) {
    // Если tenantId не указан (SUPERADMIN), используем первый доступный tenant
    let effectiveTenantId = tenantId;
    if (!effectiveTenantId) {
      const defaultTenant = await this.prisma.tenant.findFirst();
      if (!defaultTenant) {
        throw new ForbiddenException('Нет доступных организаций для создания объекта');
      }
      effectiveTenantId = defaultTenant.id;
    }

    return this.prisma.object.create({
      data: {
        tenantId: effectiveTenantId,
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

  async findAll(tenantId: string | null, userId: string, userRole: Role) {
    let whereClause: any = {};

    // SUPERADMIN видит все объекты
    if (userRole === Role.SUPERADMIN) {
      whereClause = {};
    } else if (userRole === Role.CONTRACTOR) {
      // Подрядчик видит только свои объекты
      const assignments = await this.prisma.userObjectAssignment.findMany({
        where: { userId },
        select: { objectId: true },
      });
      const objectIds = assignments.map((a) => a.objectId);
      whereClause = { tenantId, id: { in: objectIds } };
    } else {
      // Остальные роли видят объекты своего tenant
      whereClause = { tenantId };
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

  async findOne(id: string, tenantId: string | null) {
    // SUPERADMIN (tenantId = null) может видеть все объекты
    const whereClause = tenantId ? { id, tenantId } : { id };

    const object = await this.prisma.object.findFirst({
      where: whereClause,
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
        userAssignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, isActive: true },
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

  async update(id: string, tenantId: string | null, dto: UpdateObjectDto) {
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

  async assignUsers(id: string, tenantId: string | null, userIds: string[]) {
    await this.findOne(id, tenantId);

    // Удаляем все текущие назначения
    await this.prisma.userObjectAssignment.deleteMany({
      where: { objectId: id },
    });

    // Создаём новые назначения
    if (userIds.length > 0) {
      await this.prisma.userObjectAssignment.createMany({
        data: userIds.map((userId) => ({ userId, objectId: id })),
      });
    }

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string | null) {
    await this.findOne(id, tenantId);

    return this.prisma.object.delete({
      where: { id },
    });
  }

  // Расчёт прогресса объекта на основе проверок объёмов
  async calculateProgress(id: string, tenantId: string | null) {
    const whereClause = tenantId ? { id, tenantId } : { id };

    const object = await this.prisma.object.findFirst({
      where: whereClause,
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

  // Статистика для дашборда
  async getDashboardStats(tenantId: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Получаем все объекты с этапами и проверками
    // SUPERADMIN (tenantId = null) видит все объекты
    const whereClause = tenantId ? { tenantId } : {};

    const objects = await this.prisma.object.findMany({
      where: whereClause,
      include: {
        contractor: true,
        stages: {
          include: {
            volumeChecks: {
              orderBy: { date: 'desc' },
              take: 1,
            },
            payments: true,
          },
        },
      },
    });

    // Подсчёт статистики
    let totalObjects = objects.length;
    let plannedObjects = 0;
    let inProgressObjects = 0;
    let completedObjects = 0;
    let suspendedObjects = 0;
    let problemObjects = 0; // Объекты с отставанием > 10%

    let totalBudget = 0;
    let totalPaid = 0;
    let averageProgress = 0;

    const objectsWithProgress: any[] = [];

    for (const obj of objects) {
      // Статус
      switch (obj.status) {
        case 'PLANNED':
          plannedObjects++;
          break;
        case 'IN_PROGRESS':
          inProgressObjects++;
          break;
        case 'COMPLETED':
          completedObjects++;
          break;
        case 'SUSPENDED':
          suspendedObjects++;
          break;
      }

      // Бюджет
      if (obj.budget) {
        totalBudget += Number(obj.budget);
      }

      // Расчёт прогресса и отставания
      const stages = obj.stages;
      let progress = 0;
      let plannedProgress = 0;
      let stageBudget = 0;
      let stagePaid = 0;

      if (stages.length > 0) {
        for (const stage of stages) {
          // Прогресс
          const lastCheck = stage.volumeChecks?.[0];
          progress += lastCheck?.percent || 0;

          // Плановый прогресс на основе дат
          if (stage.startDate && stage.endDate) {
            const start = new Date(stage.startDate);
            const end = new Date(stage.endDate);
            if (today < start) {
              plannedProgress += 0;
            } else if (today > end) {
              plannedProgress += 100;
            } else {
              const total = end.getTime() - start.getTime();
              const elapsed = today.getTime() - start.getTime();
              plannedProgress += Math.round((elapsed / total) * 100);
            }
          }

          // Финансы по этапам
          if (stage.budget) {
            stageBudget += Number(stage.budget);
          }
          for (const payment of stage.payments) {
            stagePaid += Number(payment.amount);
          }
        }

        progress = Math.round(progress / stages.length);
        plannedProgress = Math.round(plannedProgress / stages.length);
      }

      const deviation = progress - plannedProgress;

      // Проблемный объект если отставание > 10%
      if (deviation < -10 && obj.status === 'IN_PROGRESS') {
        problemObjects++;
      }

      totalPaid += stagePaid;
      averageProgress += progress;

      objectsWithProgress.push({
        id: obj.id,
        name: obj.name,
        status: obj.status,
        contractor: obj.contractor?.name || null,
        budget: obj.budget ? Number(obj.budget) : 0,
        progress,
        plannedProgress,
        deviation,
        paid: stagePaid,
        stagesCount: stages.length,
        completedStages: stages.filter(s => (s.volumeChecks?.[0]?.percent || 0) >= 100).length,
      });
    }

    if (totalObjects > 0) {
      averageProgress = Math.round(averageProgress / totalObjects);
    }

    // Статистика по подрядчикам
    const contractorWhereClause = tenantId ? { tenantId } : {};
    const contractors = await this.prisma.contractor.findMany({
      where: contractorWhereClause,
      include: {
        _count: { select: { objects: true } },
      },
    });

    const contractorStats = contractors.map(c => ({
      id: c.id,
      name: c.name,
      objectsCount: c._count.objects,
    }));

    // Статистика по обращениям
    const appealWhereClause = tenantId ? { object: { tenantId } } : {};
    const appealStats = await this.prisma.appeal.groupBy({
      by: ['status'],
      where: appealWhereClause,
      _count: true,
    });

    const appeals = {
      total: appealStats.reduce((sum, a) => sum + a._count, 0),
      new: appealStats.find(a => a.status === 'NEW')?._count || 0,
      inProgress: appealStats.find(a => a.status === 'IN_PROGRESS')?._count || 0,
      resolved: appealStats.find(a => a.status === 'RESOLVED')?._count || 0,
    };

    return {
      summary: {
        totalObjects,
        plannedObjects,
        inProgressObjects,
        completedObjects,
        suspendedObjects,
        problemObjects,
        averageProgress,
        totalBudget,
        totalPaid,
        budgetUtilization: totalBudget > 0 ? Math.round((totalPaid / totalBudget) * 100) : 0,
      },
      objects: objectsWithProgress,
      contractors: contractorStats,
      appeals,
    };
  }
}
