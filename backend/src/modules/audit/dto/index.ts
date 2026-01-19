// Audit DTOs
import {
  IsString,
  IsOptional,
  IsDate,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAuditLogDto {
  @IsString() userId: string;
  @IsString() username: string;
  @IsString() module: string;
  @IsString() action: string;
  @IsString() entity: string;
  @IsString() entityId: string;
  @IsOptional() before?: any;
  @IsOptional() after?: any;
  @IsOptional() @IsString() ipAddress?: string;
  @IsOptional() @IsString() endpoint?: string;
  @IsOptional() @IsString() method?: string;
  @IsBoolean() success: boolean;
  @IsOptional() @IsString() errorMessage?: string;
  @IsOptional() @IsString() sessionId?: string;
}

export class AuditQueryDto {
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() entity?: string;
  @IsOptional() @IsDate() @Type(() => Date) startDate?: Date;
  @IsOptional() @IsDate() @Type(() => Date) endDate?: Date;
}
