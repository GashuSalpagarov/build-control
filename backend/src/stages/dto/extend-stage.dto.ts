import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class ExtendStageDto {
  @IsOptional()
  @IsDateString()
  newStartDate?: string;

  @IsDateString()
  newEndDate: string;

  @IsString()
  @MinLength(10, { message: 'Причина должна содержать минимум 10 символов' })
  reason: string;
}
