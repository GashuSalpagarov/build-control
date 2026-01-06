import { IsInt, IsOptional, IsString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EquipmentCheckDto } from './create-resource-check.dto';

export class UpdateResourceCheckDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  actualPeople?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentCheckDto)
  equipmentChecks?: EquipmentCheckDto[];
}
