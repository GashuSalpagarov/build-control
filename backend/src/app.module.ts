import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { ObjectsModule } from './objects/objects.module';
import { StagesModule } from './stages/stages.module';
import { EquipmentTypesModule } from './equipment-types/equipment-types.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
