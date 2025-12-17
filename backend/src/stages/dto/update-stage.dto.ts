import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateStageDto } from './create-stage.dto';

export class UpdateStageDto extends PartialType(
  OmitType(CreateStageDto, ['objectId'] as const),
) {}
