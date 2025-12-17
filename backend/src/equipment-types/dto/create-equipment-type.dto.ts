import { IsString } from 'class-validator';

export class CreateEquipmentTypeDto {
  @IsString()
  name: string;
}
