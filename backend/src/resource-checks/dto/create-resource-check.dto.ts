import { IsString, IsInt, IsOptional, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class EquipmentCheckDto {
  @IsString()
  equipmentTypeId: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

export class CreateResourceCheckDto {
  @IsString()
  stageId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(0)
  actualPeople: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentCheckDto)
  equipmentChecks?: EquipmentCheckDto[];
}
