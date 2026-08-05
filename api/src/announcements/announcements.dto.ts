import { IsString, IsInt, IsOptional, IsBoolean, Matches, MaxLength, MinLength } from 'class-validator';

export class SaveAnnouncementDTO {
  @IsOptional() @IsInt() id?: number;

  @IsString() @MinLength(1) @MaxLength(140) title: string;

  @IsString() @MaxLength(60000) body: string;

  @IsString() @Matches(/^[a-z0-9-]{1,60}$/) icon: string;

  @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) color: string;

  @IsOptional() @IsBoolean() published?: boolean;
}

export class AnnouncementIdDTO {
  @IsInt() id: number;
}

export class SetUpdateAnnouncementDTO {
  @IsOptional() @IsInt() id?: number;
}
