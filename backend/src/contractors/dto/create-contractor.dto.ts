import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateContractorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
