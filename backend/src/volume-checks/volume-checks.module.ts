import { Module } from '@nestjs/common';
import { VolumeChecksService } from './volume-checks.service';
import { VolumeChecksController } from './volume-checks.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VolumeChecksController],
  providers: [VolumeChecksService],
  exports: [VolumeChecksService],
})
export class VolumeChecksModule {}
