import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  stageId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
