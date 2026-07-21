import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  statusPageTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  statusPageDescription?: string;
}
