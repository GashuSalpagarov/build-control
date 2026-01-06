import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AppealType } from '@prisma/client';

export class CreateAppealDto {
  @IsString()
  objectId: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsEnum(AppealType)
  type: AppealType;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  description?: string;
}
