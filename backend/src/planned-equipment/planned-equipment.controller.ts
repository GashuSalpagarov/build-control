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
import { PlannedEquipmentService } from './planned-equipment.service';
import { CreatePlannedEquipmentDto } from './dto/create-planned-equipment.dto';
import { UpdatePlannedEquipmentDto } from './dto/update-planned-equipment.dto';
import { SetStageEquipmentDto } from './dto/set-stage-equipment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('planned-equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlannedEquipmentController {
  constructor(private readonly plannedEquipmentService: PlannedEquipmentService) {}

  @Post()
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePlannedEquipmentDto,
  ) {
    return this.plannedEquipmentService.create(tenantId, dto);
  }

  @Get('stage/:stageId')
  findByStage(
    @Param('stageId') stageId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.plannedEquipmentService.findByStage(stageId, tenantId);
  }

  @Patch(':id')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdatePlannedEquipmentDto,
  ) {
    return this.plannedEquipmentService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.plannedEquipmentService.remove(id, tenantId);
  }

  @Post('stage/:stageId')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  setStageEquipment(
    @Param('stageId') stageId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: SetStageEquipmentDto,
  ) {
    return this.plannedEquipmentService.setStageEquipment(stageId, tenantId, dto);
  }
}
