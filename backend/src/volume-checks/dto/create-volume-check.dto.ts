import { IsString, IsInt, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class CreateVolumeCheckDto {
  @IsString()
  stageId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(0)
  @Max(100)
  percent: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
