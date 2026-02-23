import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVolumeCheckDto } from './dto/create-volume-check.dto';

@Injectable()
export class VolumeChecksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, tenantId: string, dto: CreateVolumeCheckDto) {
    // Проверяем, что этап существует и принадлежит tenant
    const stage = await this.prisma.stage.findFirst({
      where: { id: dto.stageId },
      include: { object: true },
    });

    if (!stage || stage.object.tenantId !== tenantId) {
      throw new NotFoundException('Этап не найден');
    }

    // Проверяем, что новый процент не меньше предыдущего
    const latestCheck = await this.prisma.volumeCheck.findFirst({
      where: { stageId: dto.stageId },
      orderBy: { date: 'desc' },
    });

    if (latestCheck && dto.percent < latestCheck.percent) {
      throw new BadRequestException(
        `Процент не может быть меньше предыдущего значения (${latestCheck.percent}%)`
      );
    }

    // Создаём проверку объёма
    const volumeCheck = await this.prisma.volumeCheck.create({
      data: {
        stageId: dto.stageId,
        userId,
        date: new Date(dto.date),
        percent: dto.percent,
        comment: dto.comment,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        stage: {
          select: { id: true, name: true, objectId: true },
        },
      },
    });

    // Обновляем прогресс объекта (пересчитываем средний процент по этапам)
    await this.updateObjectProgress(stage.objectId);

    return volumeCheck;
  }

  async findAll(tenantId: string, filters: { stageId?: string; objectId?: string }) {
    const where: any = {
      stage: {
        object: { tenantId },
      },
    };

    if (filters.stageId) {
      where.stageId = filters.stageId;
    }

    if (filters.objectId) {
      where.stage = {
        ...where.stage,
        objectId: filters.objectId,
      };
    }

    return this.prisma.volumeCheck.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        stage: {
          select: { id: true, name: true, objectId: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const volumeCheck = await this.prisma.volumeCheck.findFirst({
      where: {
        id,
        stage: {
          object: { tenantId },
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        stage: {
          select: { id: true, name: true, objectId: true },
        },
      },
    });

    if (!volumeCheck) {
      throw new NotFoundException('Проверка объёма не найдена');
    }

    return volumeCheck;
  }

  // Получить последнюю проверку по этапу
  async getLatestByStage(stageId: string, tenantId: string) {
    const stage = await this.prisma.stage.findFirst({
      where: {
        id: stageId,
        object: { tenantId },
      },
    });

    if (!stage) {
      throw new NotFoundException('Этап не найден');
    }

    const latestCheck = await this.prisma.volumeCheck.findFirst({
      where: { stageId },
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return latestCheck;
  }

  // Обновить прогресс объекта на основе проверок объёма
  private async updateObjectProgress(objectId: string) {
    // Получаем все этапы объекта
    const stages = await this.prisma.stage.findMany({
      where: { objectId },
      include: {
        volumeChecks: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    if (stages.length === 0) return;

    // Вычисляем средний процент по последним проверкам каждого этапа
    const totalPercent = stages.reduce((sum, stage) => {
      const latestCheck = stage.volumeChecks[0];
      return sum + (latestCheck?.percent || 0);
    }, 0);

    const averageProgress = Math.round(totalPercent / stages.length);

    // Обновляем прогресс объекта
    await this.prisma.object.update({
      where: { id: objectId },
      data: { progress: averageProgress },
    });
  }

  // Сводка по объекту
  async getSummaryByObject(objectId: string, tenantId: string | null) {
    // SUPERADMIN (tenantId = null) может видеть все объекты
    const whereClause = tenantId ? { id: objectId, tenantId } : { id: objectId };
    const object = await this.prisma.object.findFirst({
      where: whereClause,
      include: {
        stages: {
          include: {
            volumeChecks: {
              orderBy: { date: 'desc' },
              take: 1,
            },
            _count: {
              select: { volumeChecks: true },
            },
          },
        },
      },
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    const stagesSummary = object.stages.map((stage) => {
      const latestCheck = stage.volumeChecks[0];
      return {
        stageId: stage.id,
        stageName: stage.name,
        percent: latestCheck?.percent || 0,
        lastCheckDate: latestCheck?.date,
        checksCount: stage._count.volumeChecks,
      };
    });

    const totalPercent = stagesSummary.reduce((sum, s) => sum + s.percent, 0);
    const averageProgress = stagesSummary.length > 0
      ? Math.round(totalPercent / stagesSummary.length)
      : 0;

    return {
      objectId,
      objectName: object.name,
      averageProgress,
      stages: stagesSummary,
    };
  }
}
