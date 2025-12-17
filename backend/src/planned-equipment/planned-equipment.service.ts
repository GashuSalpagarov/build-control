import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlannedEquipmentDto } from './dto/create-planned-equipment.dto';
import { UpdatePlannedEquipmentDto } from './dto/update-planned-equipment.dto';
import { SetStageEquipmentDto } from './dto/set-stage-equipment.dto';

@Injectable()
export class PlannedEquipmentService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePlannedEquipmentDto) {
    // Проверяем, что этап принадлежит тенанту
    const stage = await this.prisma.stage.findFirst({
      where: { id: dto.stageId },
      include: { object: true },
    });

    if (!stage || stage.object.tenantId !== tenantId) {
      throw new NotFoundException('Этап не найден');
    }

    return this.prisma.plannedEquipment.upsert({
      where: {
        stageId_equipmentTypeId: {
          stageId: dto.stageId,
          equipmentTypeId: dto.equipmentTypeId,
        },
      },
      update: {
        quantity: dto.quantity,
      },
      create: {
        stageId: dto.stageId,
        equipmentTypeId: dto.equipmentTypeId,
        quantity: dto.quantity,
      },
      include: {
        equipmentType: true,
      },
    });
  }

  async findByStage(stageId: string, tenantId: string) {
    // Проверяем, что этап принадлежит тенанту
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId },
      include: { object: true },
    });

    if (!stage || stage.object.tenantId !== tenantId) {
      throw new NotFoundException('Этап не найден');
    }

    return this.prisma.plannedEquipment.findMany({
      where: { stageId },
      include: {
        equipmentType: true,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdatePlannedEquipmentDto) {
    const equipment = await this.prisma.plannedEquipment.findFirst({
      where: { id },
      include: {
        stage: {
          include: { object: true },
        },
      },
    });

    if (!equipment || equipment.stage.object.tenantId !== tenantId) {
      throw new NotFoundException('Плановая техника не найдена');
    }

    return this.prisma.plannedEquipment.update({
      where: { id },
      data: {
        quantity: dto.quantity,
      },
      include: {
        equipmentType: true,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const equipment = await this.prisma.plannedEquipment.findFirst({
      where: { id },
      include: {
        stage: {
          include: { object: true },
        },
      },
    });

    if (!equipment || equipment.stage.object.tenantId !== tenantId) {
      throw new NotFoundException('Плановая техника не найдена');
    }

    return this.prisma.plannedEquipment.delete({
      where: { id },
    });
  }

  // Установить всю технику для этапа за раз (удаляет старую и создаёт новую)
  async setStageEquipment(stageId: string, tenantId: string, dto: SetStageEquipmentDto) {
    // Проверяем, что этап принадлежит тенанту
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId },
      include: { object: true },
    });

    if (!stage || stage.object.tenantId !== tenantId) {
      throw new NotFoundException('Этап не найден');
    }

    // Удаляем всю старую технику
    await this.prisma.plannedEquipment.deleteMany({
      where: { stageId },
    });

    // Создаём новую
    if (dto.equipment.length > 0) {
      await this.prisma.plannedEquipment.createMany({
        data: dto.equipment.map((item) => ({
          stageId,
          equipmentTypeId: item.equipmentTypeId,
          quantity: item.quantity,
        })),
      });
    }

    return this.findByStage(stageId, tenantId);
  }
}
