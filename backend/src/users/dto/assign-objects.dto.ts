import { IsArray, IsString } from 'class-validator';

export class AssignObjectsDto {
  @IsArray()
  @IsString({ each: true })
  objectIds: string[];
}
