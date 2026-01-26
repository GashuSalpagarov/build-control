import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string | null, dto: CreateStageDto) {
    // Проверяем, что объект существует (SUPERADMIN с tenantId=null может работать со всеми)
    const whereClause = tenantId ? { id: dto.objectId, tenantId } : { id: dto.objectId };
    const object = await this.prisma.object.findFirst({
      where: whereClause,
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    // Определяем sortOrder, если не задан
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const lastStage = await this.prisma.stage.findFirst({
        where: { objectId: dto.objectId },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (lastStage?.sortOrder ?? -1) + 1;
    }

    const stage = await this.prisma.stage.create({
      data: {
        objectId: dto.objectId,
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget,
        plannedPeople: dto.plannedPeople,
        sortOrder,
      },
      include: {
        plannedEquipment: {
          include: { equipmentType: true },
        },
      },
    });

    // Добавляем плановую технику, если указана
    if (dto.plannedEquipment?.length) {
      await this.prisma.plannedEquipment.createMany({
        data: dto.plannedEquipment.map((eq) => ({
          stageId: stage.id,
          equipmentTypeId: eq.equipmentTypeId,
          quantity: eq.quantity,
        })),
      });

      return this.findOne(stage.id, tenantId);
    }

    return stage;
  }

  async findAllByObject(objectId: string, tenantId: string | null) {
    // Проверяем, что объект существует (SUPERADMIN с tenantId=null может работать со всеми)
    const whereClause = tenantId ? { id: objectId, tenantId } : { id: objectId };
    const object = await this.prisma.object.findFirst({
      where: whereClause,
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    return this.prisma.stage.findMany({
      where: { objectId },
      include: {
        plannedEquipment: {
          include: { equipmentType: true },
        },
        volumeChecks: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string | null) {
    const stage = await this.prisma.stage.findFirst({
      where: { id },
      include: {
        object: true,
        plannedEquipment: {
          include: { equipmentType: true },
        },
        resourceChecks: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            equipmentChecks: {
              include: { equipmentType: true },
            },
          },
        },
        volumeChecks: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    // SUPERADMIN (tenantId = null) может видеть все этапы
    if (!stage || (tenantId && stage.object.tenantId !== tenantId)) {
      throw new NotFoundException('Этап не найден');
    }

    return stage;
  }

  async update(id: string, tenantId: string | null, dto: UpdateStageDto) {
    await this.findOne(id, tenantId);

    const stage = await this.prisma.stage.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget,
        plannedPeople: dto.plannedPeople,
        sortOrder: dto.sortOrder,
      },
      include: {
        plannedEquipment: {
          include: { equipmentType: true },
        },
      },
    });

    // Обновляем плановую технику, если указана
    if (dto.plannedEquipment) {
      // Удаляем старые записи
      await this.prisma.plannedEquipment.deleteMany({
        where: { stageId: id },
      });

      // Создаём новые
      if (dto.plannedEquipment.length > 0) {
        await this.prisma.plannedEquipment.createMany({
          data: dto.plannedEquipment.map((eq) => ({
            stageId: id,
            equipmentTypeId: eq.equipmentTypeId,
            quantity: eq.quantity,
          })),
        });
      }

      return this.findOne(id, tenantId);
    }

    return stage;
  }

  async remove(id: string, tenantId: string | null) {
    await this.findOne(id, tenantId);

    return this.prisma.stage.delete({
      where: { id },
    });
  }

  async reorder(objectId: string, tenantId: string | null, stageIds: string[]) {
    // Проверяем, что объект существует (SUPERADMIN с tenantId=null может работать со всеми)
    const whereClause = tenantId ? { id: objectId, tenantId } : { id: objectId };
    const object = await this.prisma.object.findFirst({
      where: whereClause,
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    // Обновляем порядок этапов
    await Promise.all(
      stageIds.map((stageId, index) =>
        this.prisma.stage.update({
          where: { id: stageId },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.findAllByObject(objectId, tenantId);
  }
}
