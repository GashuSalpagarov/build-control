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
import { ContractorsService } from './contractors.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('contractors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Post()
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateContractorDto,
  ) {
    return this.contractorsService.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.contractorsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.contractorsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.MINISTER, Role.TECHNADZOR)
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateContractorDto,
  ) {
    return this.contractorsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles(Role.MINISTER)
  remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.contractorsService.remove(id, tenantId);
  }
}
