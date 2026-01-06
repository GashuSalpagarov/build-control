import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { UpdateAppealDto, AddMessageDto } from './dto/update-appeal.dto';
import { AppealStatus } from '@prisma/client';

@Injectable()
export class AppealsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAppealDto, userId: string, tenantId: string) {
    // Проверяем, что объект принадлежит tenant
    const object = await this.prisma.object.findFirst({
      where: { id: dto.objectId, tenantId },
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    // Если указан этап, проверяем его
    if (dto.stageId) {
      const stage = await this.prisma.stage.findFirst({
        where: { id: dto.stageId, objectId: dto.objectId },
      });

      if (!stage) {
        throw new NotFoundException('Этап не найден');
      }
    }

    return this.prisma.appeal.create({
      data: {
        objectId: dto.objectId,
        stageId: dto.stageId,
        userId,
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        status: AppealStatus.NEW,
      },
      include: {
        object: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        messages: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { messages: true } },
      },
    });
  }

  async findAll(tenantId: string, filters?: { objectId?: string; status?: AppealStatus; userId?: string }) {
    const where: any = {};

    // Фильтр по объектам tenant
    where.object = { tenantId };

    if (filters?.objectId) {
      where.objectId = filters.objectId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    return this.prisma.appeal.findMany({
      where,
      include: {
        object: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const appeal = await this.prisma.appeal.findFirst({
      where: {
        id,
        object: { tenantId },
      },
      include: {
        object: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        messages: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { messages: true } },
      },
    });

    if (!appeal) {
      throw new NotFoundException('Обращение не найдено');
    }

    return appeal;
  }

  async updateStatus(id: string, dto: UpdateAppealDto, tenantId: string, userRole: string) {
    // Только министр и выше могут менять статус
    if (!['MINISTER', 'SUPERADMIN'].includes(userRole)) {
      throw new ForbiddenException('Недостаточно прав для изменения статуса');
    }

    const appeal = await this.prisma.appeal.findFirst({
      where: {
        id,
        object: { tenantId },
      },
    });

    if (!appeal) {
      throw new NotFoundException('Обращение не найдено');
    }

    return this.prisma.appeal.update({
      where: { id },
      data: { status: dto.status },
      include: {
        object: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        messages: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async addMessage(appealId: string, dto: AddMessageDto, userId: string, tenantId: string) {
    const appeal = await this.prisma.appeal.findFirst({
      where: {
        id: appealId,
        object: { tenantId },
      },
    });

    if (!appeal) {
      throw new NotFoundException('Обращение не найдено');
    }

    // Создаём сообщение
    const message = await this.prisma.appealMessage.create({
      data: {
        appealId,
        userId,
        text: dto.text,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Если обращение было NEW, переводим в IN_PROGRESS
    if (appeal.status === AppealStatus.NEW && appeal.userId !== userId) {
      await this.prisma.appeal.update({
        where: { id: appealId },
        data: { status: AppealStatus.IN_PROGRESS },
      });
    }

    return message;
  }

  async getMessages(appealId: string, tenantId: string) {
    const appeal = await this.prisma.appeal.findFirst({
      where: {
        id: appealId,
        object: { tenantId },
      },
    });

    if (!appeal) {
      throw new NotFoundException('Обращение не найдено');
    }

    return this.prisma.appealMessage.findMany({
      where: { appealId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getStats(tenantId: string) {
    const [total, newCount, inProgressCount, resolvedCount] = await Promise.all([
      this.prisma.appeal.count({
        where: { object: { tenantId } },
      }),
      this.prisma.appeal.count({
        where: { object: { tenantId }, status: AppealStatus.NEW },
      }),
      this.prisma.appeal.count({
        where: { object: { tenantId }, status: AppealStatus.IN_PROGRESS },
      }),
      this.prisma.appeal.count({
        where: { object: { tenantId }, status: AppealStatus.RESOLVED },
      }),
    ]);

    return {
      total,
      new: newCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
    };
  }
}
