import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
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
  @Roles('CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'SUPERADMIN')
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
}
