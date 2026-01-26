import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceCheckDto } from './dto/create-resource-check.dto';
import { UpdateResourceCheckDto } from './dto/update-resource-check.dto';

@Injectable()
export class ResourceChecksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, tenantId: string, dto: CreateResourceCheckDto) {
    // Проверяем, что этап существует и принадлежит tenant
    const stage = await this.prisma.stage.findFirst({
      where: { id: dto.stageId },
      include: { object: true },
    });

    if (!stage || stage.object.tenantId !== tenantId) {
      throw new NotFoundException('Этап не найден');
    }

    // Проверяем уникальность (stageId, date)
    const existingCheck = await this.prisma.resourceCheck.findUnique({
      where: {
        stageId_date: {
          stageId: dto.stageId,
          date: new Date(dto.date),
        },
      },
    });

    if (existingCheck) {
      throw new BadRequestException('Проверка на эту дату уже существует');
    }

    // Создаём проверку с техникой
    const resourceCheck = await this.prisma.resourceCheck.create({
      data: {
        stageId: dto.stageId,
        userId,
        date: new Date(dto.date),
        actualPeople: dto.actualPeople,
        comment: dto.comment,
        equipmentChecks: dto.equipmentChecks?.length
          ? {
              create: dto.equipmentChecks.map((eq) => ({
                equipmentTypeId: eq.equipmentTypeId,
                quantity: eq.quantity,
              })),
            }
          : undefined,
      },
      include: {
        equipmentChecks: {
          include: { equipmentType: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        stage: {
          select: { id: true, name: true },
        },
      },
    });

    return resourceCheck;
  }

  async findAll(tenantId: string, filters: { stageId?: string; date?: string; objectId?: string }) {
    const where: any = {};

    if (filters.stageId) {
      where.stageId = filters.stageId;
    }

    if (filters.date) {
      where.date = new Date(filters.date);
    }

    if (filters.objectId) {
      where.stage = {
        objectId: filters.objectId,
      };
    }

    // Фильтруем по tenant через stage -> object
    where.stage = {
      ...where.stage,
      object: {
        tenantId,
      },
    };

    return this.prisma.resourceCheck.findMany({
      where,
      include: {
        equipmentChecks: {
          include: { equipmentType: true },
        },
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
    const check = await this.prisma.resourceCheck.findFirst({
      where: {
        id,
        stage: {
          object: { tenantId },
        },
      },
      include: {
        equipmentChecks: {
          include: { equipmentType: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        stage: {
          select: { id: true, name: true, objectId: true },
        },
      },
    });

    if (!check) {
      throw new NotFoundException('Проверка не найдена');
    }

    return check;
  }

  async update(id: string, userId: string, tenantId: string, dto: UpdateResourceCheckDto) {
    const check = await this.findOne(id, tenantId);

    // Проверяем, что редактирование только сегодняшней проверки
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(check.date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() !== today.getTime()) {
      throw new ForbiddenException('Можно редактировать только сегодняшнюю проверку');
    }

    // Удаляем старые записи техники и создаём новые
    if (dto.equipmentChecks !== undefined) {
      await this.prisma.equipmentCheck.deleteMany({
        where: { resourceCheckId: id },
      });
    }

    return this.prisma.resourceCheck.update({
      where: { id },
      data: {
        actualPeople: dto.actualPeople,
        comment: dto.comment,
        equipmentChecks: dto.equipmentChecks?.length
          ? {
              create: dto.equipmentChecks.map((eq) => ({
                equipmentTypeId: eq.equipmentTypeId,
                quantity: eq.quantity,
              })),
            }
          : undefined,
      },
      include: {
        equipmentChecks: {
          include: { equipmentType: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        stage: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(id: string, tenantId: string) {
    const check = await this.findOne(id, tenantId);

    // Проверяем, что удаление только сегодняшней проверки
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(check.date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() !== today.getTime()) {
      throw new ForbiddenException('Можно удалять только сегодняшнюю проверку');
    }

    // Удаляем связанные записи техники
    await this.prisma.equipmentCheck.deleteMany({
      where: { resourceCheckId: id },
    });

    return this.prisma.resourceCheck.delete({
      where: { id },
    });
  }

  // Получение проверок для календаря (по диапазону дат)
  async findByDateRange(
    tenantId: string | null,
    objectId: string,
    startDate: string,
    endDate: string,
  ) {
    // SUPERADMIN (tenantId = null) может видеть все проверки
    const stageWhereClause = tenantId
      ? { objectId, object: { tenantId } }
      : { objectId };

    return this.prisma.resourceCheck.findMany({
      where: {
        stage: stageWhereClause,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        equipmentChecks: {
          include: { equipmentType: true },
        },
        stage: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'asc' },
    });
  }
}
