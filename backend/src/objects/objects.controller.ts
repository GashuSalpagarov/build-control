import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ObjectsService } from './objects.service';
import { CreateObjectDto } from './dto/create-object.dto';
import { UpdateObjectDto } from './dto/update-object.dto';
import { AssignUsersDto } from './dto/assign-users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('objects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Post()
  @Roles(Role.MINISTER, Role.TECHNADZOR, Role.SUPERADMIN)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateObjectDto,
  ) {
    return this.objectsService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.objectsService.findAll(tenantId, userId, userRole);
  }

  @Get('dashboard/stats')
  @Roles(Role.MINISTER, Role.GOVERNMENT, Role.SUPERADMIN)
  getDashboardStats(@CurrentUser('tenantId') tenantId: string) {
    return this.objectsService.getDashboardStats(tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.objectsService.findOne(id, tenantId);
  }

  @Get(':id/progress')
  getProgress(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.objectsService.calculateProgress(id, tenantId);
  }

  @Patch(':id/users')
  @Roles(Role.MINISTER, Role.SUPERADMIN)
  assignUsers(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: AssignUsersDto,
  ) {
    return this.objectsService.assignUsers(id, tenantId, dto.userIds);
  }

  @Patch(':id')
  @Roles(Role.MINISTER, Role.TECHNADZOR, Role.SUPERADMIN)
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateObjectDto,
  ) {
    return this.objectsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles(Role.MINISTER, Role.SUPERADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.objectsService.remove(id, tenantId);
  }
}
