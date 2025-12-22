import { IsString, IsInt, IsArray, IsOptional } from 'class-validator';

export class LogSwearingDTO {
  @IsOptional() @IsString() username?: string;

  @IsOptional() @IsInt() account_id?: number;

  @IsOptional() @IsString() ip?: string;

  @IsString() message: string;

  @IsArray() @IsString({ each: true }) matched_words: string[];
}
