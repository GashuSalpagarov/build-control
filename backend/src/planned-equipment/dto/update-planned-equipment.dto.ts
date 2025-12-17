import { IsInt, Min, IsOptional } from 'class-validator';

export class UpdatePlannedEquipmentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
