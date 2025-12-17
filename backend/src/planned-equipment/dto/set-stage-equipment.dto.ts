import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class EquipmentItem {
  @IsString()
  equipmentTypeId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class SetStageEquipmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentItem)
  equipment: EquipmentItem[];
}
