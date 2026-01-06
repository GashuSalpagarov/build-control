import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.ACCOUNTANT)
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(userId, tenantId, dto);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.ACCOUNTANT, Role.TECHNADZOR, Role.GOVERNMENT)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('stageId') stageId?: string,
    @Query('objectId') objectId?: string,
  ) {
    return this.paymentsService.findAll(tenantId, { stageId, objectId });
  }

  @Get('summary/object/:objectId')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.ACCOUNTANT, Role.TECHNADZOR, Role.GOVERNMENT)
  getSummaryByObject(
    @CurrentUser('tenantId') tenantId: string,
    @Param('objectId') objectId: string,
  ) {
    return this.paymentsService.getSummaryByObject(objectId, tenantId);
  }

  @Get('summary/stage/:stageId')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.ACCOUNTANT, Role.TECHNADZOR, Role.GOVERNMENT)
  getSummaryByStage(
    @CurrentUser('tenantId') tenantId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.paymentsService.getSummaryByStage(stageId, tenantId);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.MINISTER, Role.ACCOUNTANT, Role.TECHNADZOR, Role.GOVERNMENT)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOne(id, tenantId);
  }
}
