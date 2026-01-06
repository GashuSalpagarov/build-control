import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, tenantId: string, dto: CreatePaymentDto) {
    // Проверяем, что этап существует и принадлежит tenant
    const stage = await this.prisma.stage.findFirst({
      where: { id: dto.stageId },
      include: { object: true },
    });

    if (!stage || stage.object.tenantId !== tenantId) {
      throw new NotFoundException('Этап не найден');
    }

    // Создаём платёж
    const payment = await this.prisma.payment.create({
      data: {
        stageId: dto.stageId,
        userId,
        date: new Date(dto.date),
        amount: new Prisma.Decimal(dto.amount),
        comment: dto.comment,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        stage: {
          select: { id: true, name: true, budget: true },
        },
      },
    });

    return payment;
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

    return this.prisma.payment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        stage: {
          select: { id: true, name: true, budget: true, objectId: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const payment = await this.prisma.payment.findFirst({
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
          select: { id: true, name: true, budget: true, objectId: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Платёж не найден');
    }

    return payment;
  }

  // Сводка по объекту
  async getSummaryByObject(objectId: string, tenantId: string) {
    // Проверяем доступ к объекту
    const object = await this.prisma.object.findFirst({
      where: { id: objectId, tenantId },
      include: {
        stages: {
          select: { id: true, name: true, budget: true },
        },
      },
    });

    if (!object) {
      throw new NotFoundException('Объект не найден');
    }

    // Получаем все платежи по этапам объекта
    const payments = await this.prisma.payment.groupBy({
      by: ['stageId'],
      where: {
        stage: { objectId },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Формируем сводку по этапам
    const stagesSummary = object.stages.map((stage) => {
      const stagePayments = payments.find((p) => p.stageId === stage.id);
      const paid = stagePayments?._sum.amount?.toNumber() || 0;
      const budget = stage.budget?.toNumber() || 0;

      return {
        stageId: stage.id,
        stageName: stage.name,
        budget,
        paid,
        remaining: budget - paid,
        paymentsCount: stagePayments?._count || 0,
        percentPaid: budget > 0 ? Math.round((paid / budget) * 100) : 0,
      };
    });

    // Общая сводка
    const totalBudget = stagesSummary.reduce((sum, s) => sum + s.budget, 0);
    const totalPaid = stagesSummary.reduce((sum, s) => sum + s.paid, 0);
    const totalPayments = stagesSummary.reduce((sum, s) => sum + s.paymentsCount, 0);

    return {
      objectId,
      objectName: object.name,
      totalBudget,
      totalPaid,
      totalRemaining: totalBudget - totalPaid,
      totalPaymentsCount: totalPayments,
      percentPaid: totalBudget > 0 ? Math.round((totalPaid / totalBudget) * 100) : 0,
      stages: stagesSummary,
    };
  }

  // Сводка по этапу
  async getSummaryByStage(stageId: string, tenantId: string) {
    const stage = await this.prisma.stage.findFirst({
      where: {
        id: stageId,
        object: { tenantId },
      },
      include: {
        object: { select: { id: true, name: true } },
      },
    });

    if (!stage) {
      throw new NotFoundException('Этап не найден');
    }

    const payments = await this.prisma.payment.aggregate({
      where: { stageId },
      _sum: { amount: true },
      _count: true,
    });

    const paid = payments._sum.amount?.toNumber() || 0;
    const budget = stage.budget?.toNumber() || 0;

    return {
      stageId: stage.id,
      stageName: stage.name,
      objectId: stage.object.id,
      objectName: stage.object.name,
      budget,
      paid,
      remaining: budget - paid,
      paymentsCount: payments._count,
      percentPaid: budget > 0 ? Math.round((paid / budget) * 100) : 0,
    };
  }
}
