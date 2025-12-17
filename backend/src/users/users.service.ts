import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignObjectsDto } from './dto/assign-objects.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateUserDto) {
    // Проверяем уникальность email
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { objectAssignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        objectAssignments: {
          include: {
            object: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto) {
    await this.findOne(id, tenantId);

    // Если меняется email, проверяем уникальность
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
    }

    const data: any = {
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
      role: dto.role,
      isActive: dto.isActive,
    };

    // Если передан новый пароль, хешируем его
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.user.delete({
      where: { id },
    });
  }

  // Привязка пользователя к объектам
  async assignObjects(id: string, tenantId: string, dto: AssignObjectsDto) {
    await this.findOne(id, tenantId);

    // Удаляем старые привязки
    await this.prisma.userObjectAssignment.deleteMany({
      where: { userId: id },
    });

    // Создаём новые привязки
    if (dto.objectIds.length > 0) {
      await this.prisma.userObjectAssignment.createMany({
        data: dto.objectIds.map((objectId) => ({
          userId: id,
          objectId,
        })),
      });
    }

    return this.findOne(id, tenantId);
  }

  // Получение объектов пользователя
  async getAssignedObjects(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    const assignments = await this.prisma.userObjectAssignment.findMany({
      where: { userId: id },
      include: {
        object: true,
      },
    });

    return assignments.map((a) => a.object);
  }
}
