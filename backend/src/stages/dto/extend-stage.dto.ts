import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { IsAfterDate } from '../../common/validators/date-range.validator';

export class ExtendStageDto {
  @IsOptional()
  @IsDateString()
  newStartDate?: string;

  @IsDateString()
  @IsAfterDate('newStartDate')
  newEndDate: string;

  @IsString()
  @MinLength(10, { message: 'Причина должна содержать минимум 10 символов' })
  reason: string;
}
