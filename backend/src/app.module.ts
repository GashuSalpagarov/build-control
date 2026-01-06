import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { ObjectsModule } from './objects/objects.module';
import { StagesModule } from './stages/stages.module';
import { EquipmentTypesModule } from './equipment-types/equipment-types.module';
import { ContractorsModule } from './contractors/contractors.module';
import { UsersModule } from './users/users.module';
import { PlannedEquipmentModule } from './planned-equipment/planned-equipment.module';
import { ResourceChecksModule } from './resource-checks/resource-checks.module';
import { PaymentsModule } from './payments/payments.module';
import { VolumeChecksModule } from './volume-checks/volume-checks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    FileStorageModule,
    ObjectsModule,
    StagesModule,
    EquipmentTypesModule,
    ContractorsModule,
    UsersModule,
    PlannedEquipmentModule,
    ResourceChecksModule,
    PaymentsModule,
    VolumeChecksModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
