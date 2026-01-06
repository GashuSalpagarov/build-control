import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AppealStatus } from '@prisma/client';

export class UpdateAppealDto {
  @IsOptional()
  @IsEnum(AppealStatus)
  status?: AppealStatus;
}

export class AddMessageDto {
  @IsString()
  text: string;
}
