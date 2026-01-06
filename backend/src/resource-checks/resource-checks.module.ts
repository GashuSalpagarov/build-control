import { Module } from '@nestjs/common';
import { ResourceChecksService } from './resource-checks.service';
import { ResourceChecksController } from './resource-checks.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResourceChecksController],
  providers: [ResourceChecksService],
  exports: [ResourceChecksService],
})
export class ResourceChecksModule {}
