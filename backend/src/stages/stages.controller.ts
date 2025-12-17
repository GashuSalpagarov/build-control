import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { StagesService } from './stages.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('stages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Post()
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.stagesService.create(tenantId, dto);
  }

  @Get()
  findAllByObject(
    @Query('objectId') objectId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.stagesService.findAllByObject(objectId, tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.stagesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stagesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.stagesService.remove(id, tenantId);
  }

  @Patch('reorder/:objectId')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  reorder(
    @Param('objectId') objectId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body('stageIds') stageIds: string[],
  ) {
    return this.stagesService.reorder(objectId, tenantId, stageIds);
  }
}
