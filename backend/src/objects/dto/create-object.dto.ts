import { IsString, IsOptional, IsDateString, IsNumber, IsEnum } from 'class-validator';
import { ObjectStatus } from '@prisma/client';
import { IsAfterDate } from '../../common/validators/date-range.validator';

export class CreateObjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contractorId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @IsAfterDate('startDate')
  endDate?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsEnum(ObjectStatus)
  status?: ObjectStatus;
}
