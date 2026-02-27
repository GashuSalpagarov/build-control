import { IsOptional, IsDateString, IsInt, IsString, Min, Max } from 'class-validator';

export class UpdateVolumeCheckDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percent?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
