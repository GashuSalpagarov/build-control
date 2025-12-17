import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentTypeDto } from './dto/create-equipment-type.dto';

@Injectable()
export class EquipmentTypesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateEquipmentTypeDto) {
    // Проверяем уникальность названия в рамках тенанта
    const existing = await this.prisma.equipmentType.findFirst({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Тип техники с таким названием уже существует');
    }

    return this.prisma.equipmentType.create({
      data: {
        tenantId,
        name: dto.name,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.equipmentType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const equipmentType = await this.prisma.equipmentType.findFirst({
      where: { id, tenantId },
    });

    if (!equipmentType) {
      throw new NotFoundException('Тип техники не найден');
    }

    return equipmentType;
  }

  async update(id: string, tenantId: string, dto: CreateEquipmentTypeDto) {
    await this.findOne(id, tenantId);

    // Проверяем уникальность нового названия
    const existing = await this.prisma.equipmentType.findFirst({
      where: { tenantId, name: dto.name, NOT: { id } },
    });

    if (existing) {
      throw new ConflictException('Тип техники с таким названием уже существует');
    }

    return this.prisma.equipmentType.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.equipmentType.delete({
      where: { id },
    });
  }
}
