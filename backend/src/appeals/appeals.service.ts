import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { UpdateAppealDto, AddMessageDto } from './dto/update-appeal.dto';
import { AppealStatus, Attachment } from '@prisma/client';
import { FILE_STORAGE } from '../file-storage/file-storage.interface';
import type { IFileStorage } from '../file-storage/file-storage.interface';

@Injectable()
export class AppealsService {
  constructor(
    private prisma: PrismaService,
    @Inject(FILE_STORAGE) private fileStorage: IFileStorage,
  ) {}

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
        attachments: true,
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
        attachments: true,
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

  async uploadAttachments(
    appealId: string,
    files: Express.Multer.File[],
    userId: string,
    tenantId: string,
  ) {
    // Проверяем что обращение существует и принадлежит tenant
    await this.findOne(appealId, tenantId);

    const attachments: Attachment[] = [];
    for (const file of files) {
      const fileInfo = await this.fileStorage.save(file, 'appeals');
      const attachment = await this.prisma.attachment.create({
        data: {
          appealId,
          path: fileInfo.path,
          filename: fileInfo.filename,
          mimeType: fileInfo.mimeType,
          size: fileInfo.size,
        },
      });
      attachments.push(attachment);
    }

    return attachments;
  }

  async deleteAttachment(
    attachmentId: string,
    userId: string,
    userRole: string,
    tenantId: string,
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        appeal: {
          include: {
            object: { select: { tenantId: true } },
          },
        },
      },
    });

    if (!attachment || !attachment.appeal) {
      throw new NotFoundException('Вложение не найдено');
    }

    // Проверяем tenant
    if (attachment.appeal.object.tenantId !== tenantId) {
      throw new NotFoundException('Вложение не найдено');
    }

    // Проверяем авторство — удалять может только автор обращения или SUPERADMIN/MINISTER
    if (
      attachment.appeal.userId !== userId &&
      !['SUPERADMIN', 'MINISTER'].includes(userRole)
    ) {
      throw new ForbiddenException('Вы можете удалять только свои вложения');
    }

    await this.fileStorage.delete(attachment.path);
    await this.prisma.attachment.delete({ where: { id: attachmentId } });

    return { success: true };
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
