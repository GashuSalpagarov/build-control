import { IsString, IsInt, Min } from 'class-validator';

export class CreatePlannedEquipmentDto {
  @IsString()
  stageId: string;

  @IsString()
  equipmentTypeId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
