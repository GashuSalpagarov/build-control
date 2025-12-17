import { IsString, IsOptional, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PlannedEquipmentDto {
  @IsString()
  equipmentTypeId: string;

  @IsNumber()
  quantity: number;
}

export class CreateStageDto {
  @IsString()
  objectId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsNumber()
  plannedPeople?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlannedEquipmentDto)
  plannedEquipment?: PlannedEquipmentDto[];
}
