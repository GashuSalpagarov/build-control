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
import { EquipmentTypesService } from './equipment-types.service';
import { CreateEquipmentTypeDto } from './dto/create-equipment-type.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('equipment-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentTypesController {
  constructor(private readonly equipmentTypesService: EquipmentTypesService) {}

  @Post()
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateEquipmentTypeDto,
  ) {
    return this.equipmentTypesService.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.equipmentTypesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.equipmentTypesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateEquipmentTypeDto,
  ) {
    return this.equipmentTypesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles(Role.MINISTER)
  remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.equipmentTypesService.remove(id, tenantId);
  }
}
