import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';

@Injectable()
export class ContractorsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateContractorDto) {
    return this.prisma.contractor.create({
      data: {
        tenantId,
        name: dto.name,
        inn: dto.inn,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.contractor.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { objects: true },
        },
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const contractor = await this.prisma.contractor.findFirst({
      where: { id, tenantId },
      include: {
        objects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!contractor) {
      throw new NotFoundException('Подрядчик не найден');
    }

    return contractor;
  }

  async update(id: string, tenantId: string, dto: UpdateContractorDto) {
    await this.findOne(id, tenantId);

    return this.prisma.contractor.update({
      where: { id },
      data: {
        name: dto.name,
        inn: dto.inn,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const contractor = await this.findOne(id, tenantId);

    // Проверяем, есть ли привязанные объекты
    if (contractor.objects.length > 0) {
      throw new NotFoundException(
        'Невозможно удалить подрядчика с привязанными объектами',
      );
    }

    return this.prisma.contractor.delete({
      where: { id },
    });
  }
}
