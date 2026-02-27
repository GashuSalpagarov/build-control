import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VolumeChecksService } from './volume-checks.service';
import { CreateVolumeCheckDto } from './dto/create-volume-check.dto';
import { UpdateVolumeCheckDto } from './dto/update-volume-check.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('volume-checks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VolumeChecksController {
  constructor(private readonly volumeChecksService: VolumeChecksService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR)
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateVolumeCheckDto,
  ) {
    return this.volumeChecksService.create(userId, tenantId, dto);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.ACCOUNTANT, Role.GOVERNMENT)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('stageId') stageId?: string,
    @Query('objectId') objectId?: string,
  ) {
    return this.volumeChecksService.findAll(tenantId, { stageId, objectId });
  }

  @Get('summary/object/:objectId')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.ACCOUNTANT, Role.GOVERNMENT)
  getSummaryByObject(
    @CurrentUser('tenantId') tenantId: string,
    @Param('objectId') objectId: string,
  ) {
    return this.volumeChecksService.getSummaryByObject(objectId, tenantId);
  }

  @Get('latest/stage/:stageId')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.ACCOUNTANT, Role.GOVERNMENT)
  getLatestByStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.volumeChecksService.getLatestByStage(stageId, tenantId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR)
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateVolumeCheckDto,
  ) {
    return this.volumeChecksService.update(id, userId, tenantId, dto);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.ACCOUNTANT, Role.GOVERNMENT)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.volumeChecksService.findOne(id, tenantId);
  }
}
