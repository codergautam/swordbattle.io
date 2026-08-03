import { IsString, IsInt, IsOptional, IsIn, IsObject, IsArray, ArrayMaxSize, MaxLength, MinLength } from 'class-validator';

const maxImages = 3;
const maxImageLen = 3_200_000;

export const SUPPORT_CATEGORIES = ['password', 'lag', 'bug', 'other'];
export const SUPPORT_STATUSES = ['open', 'answered', 'closed'];

export class SubmitTicketDTO {
  @IsIn(SUPPORT_CATEGORIES) category: string;

  @IsOptional() @IsString() @MaxLength(140) subject?: string;

  @IsString() @MinLength(1) @MaxLength(4000) message: string;

  @IsOptional() @IsObject() details?: Record<string, any>;

  @IsOptional() @IsArray() @ArrayMaxSize(maxImages) @IsString({ each: true }) @MaxLength(maxImageLen, { each: true }) images?: string[];

  @IsOptional() @IsString() @MaxLength(200) contact?: string;

  @IsOptional() @IsString() @MaxLength(100) clientId?: string;

  @IsOptional() @IsString() secret?: string;
}

export class MyTicketsDTO {
  @IsOptional() @IsString() @MaxLength(100) clientId?: string;
  @IsOptional() @IsString() secret?: string;
}

export class UserReplyDTO {
  @IsInt() ticketId: number;
  @IsString() @MinLength(1) @MaxLength(4000) message: string;
  @IsOptional() @IsArray() @ArrayMaxSize(maxImages) @IsString({ each: true }) @MaxLength(maxImageLen, { each: true }) images?: string[];
  @IsOptional() @IsString() @MaxLength(100) clientId?: string;
  @IsOptional() @IsString() secret?: string;
}

export class SeenTicketDTO {
  @IsInt() ticketId: number;
  @IsOptional() @IsString() @MaxLength(100) clientId?: string;
  @IsOptional() @IsString() secret?: string;
}

export class AdminReplyDTO {
  @IsInt() ticketId: number;
  @IsString() @MinLength(1) @MaxLength(4000) message: string;
  @IsOptional() @IsArray() @ArrayMaxSize(maxImages) @IsString({ each: true }) @MaxLength(maxImageLen, { each: true }) images?: string[];
  @IsOptional() @IsIn(SUPPORT_STATUSES) status?: string;
}

export class AdminStatusDTO {
  @IsInt() ticketId: number;
  @IsIn(SUPPORT_STATUSES) status: string;
}
