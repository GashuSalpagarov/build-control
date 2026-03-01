import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AppealsService } from './appeals.service';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { UpdateAppealDto, AddMessageDto } from './dto/update-appeal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppealStatus } from '@prisma/client';

@Controller('appeals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Post()
  @Roles('CONTRACTOR', 'INSPECTOR', 'ACCOUNTANT')
  create(@Body() dto: CreateAppealDto, @Request() req) {
    return this.appealsService.create(dto, req.user.id, req.user.tenantId);
  }

  @Get()
  @Roles('CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'GOVERNMENT', 'SUPERADMIN')
  findAll(
    @Request() req,
    @Query('objectId') objectId?: string,
    @Query('status') status?: AppealStatus,
    @Query('my') my?: string,
  ) {
    const filters: any = {};

    if (objectId) filters.objectId = objectId;
    if (status) filters.status = status;

    // Если запрос "мои обращения" или роль CONTRACTOR - показываем только свои
    if (my === 'true' || req.user.role === 'CONTRACTOR') {
      filters.userId = req.user.id;
    }

    return this.appealsService.findAll(req.user.tenantId, filters);
  }

  @Get('stats')
  @Roles('MINISTER', 'GOVERNMENT', 'SUPERADMIN')
  getStats(@Request() req) {
    return this.appealsService.getStats(req.user.tenantId);
  }

  @Delete('attachments/:attachmentId')
  @Roles('CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'SUPERADMIN')
  deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Request() req,
  ) {
    return this.appealsService.deleteAttachment(
      attachmentId,
      req.user.id,
      req.user.role,
      req.user.tenantId,
    );
  }

  @Get(':id')
  @Roles('CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'GOVERNMENT', 'SUPERADMIN')
  findOne(@Param('id') id: string, @Request() req) {
    return this.appealsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id/status')
  @Roles('MINISTER', 'SUPERADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppealDto,
    @Request() req,
  ) {
    return this.appealsService.updateStatus(id, dto, req.user.tenantId, req.user.role);
  }

  @Post(':id/messages')
  @Roles('CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'SUPERADMIN')
  addMessage(
    @Param('id') appealId: string,
    @Body() dto: AddMessageDto,
    @Request() req,
  ) {
    return this.appealsService.addMessage(appealId, dto, req.user.id, req.user.tenantId);
  }

  @Get(':id/messages')
  @Roles('CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'GOVERNMENT', 'SUPERADMIN')
  getMessages(@Param('id') appealId: string, @Request() req) {
    return this.appealsService.getMessages(appealId, req.user.tenantId);
  }

  @Post(':id/attachments')
  @Roles('CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'SUPERADMIN')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadAttachments(
    @Param('id') appealId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(image\/(jpeg|png|gif|webp|svg\+xml)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.appealsService.uploadAttachments(
      appealId,
      files,
      req.user.id,
      req.user.tenantId,
    );
  }
}
