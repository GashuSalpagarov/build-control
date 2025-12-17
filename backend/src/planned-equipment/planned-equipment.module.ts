import { Module } from '@nestjs/common';
import { PlannedEquipmentService } from './planned-equipment.service';
import { PlannedEquipmentController } from './planned-equipment.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlannedEquipmentController],
  providers: [PlannedEquipmentService],
  exports: [PlannedEquipmentService],
})
export class PlannedEquipmentModule {}
