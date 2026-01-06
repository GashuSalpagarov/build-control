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
} from '@nestjs/common';
import { ResourceChecksService } from './resource-checks.service';
import { CreateResourceCheckDto } from './dto/create-resource-check.dto';
import { UpdateResourceCheckDto } from './dto/update-resource-check.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('resource-checks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourceChecksController {
  constructor(private readonly resourceChecksService: ResourceChecksService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.INSPECTOR)
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateResourceCheckDto,
  ) {
    return this.resourceChecksService.create(userId, tenantId, dto);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.INSPECTOR, Role.GOVERNMENT)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('stageId') stageId?: string,
    @Query('date') date?: string,
    @Query('objectId') objectId?: string,
  ) {
    return this.resourceChecksService.findAll(tenantId, { stageId, date, objectId });
  }

  @Get('by-date-range')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.INSPECTOR, Role.GOVERNMENT)
  findByDateRange(
    @CurrentUser('tenantId') tenantId: string,
    @Query('objectId') objectId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.resourceChecksService.findByDateRange(
      tenantId,
      objectId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.INSPECTOR, Role.GOVERNMENT)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.resourceChecksService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR, Role.INSPECTOR)
  update(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateResourceCheckDto,
  ) {
    return this.resourceChecksService.update(id, userId, tenantId, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.TECHNADZOR)
  delete(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.resourceChecksService.delete(id, tenantId);
  }
}
