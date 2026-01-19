// Reports DTOs
import { IsString, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateReportDto {
  @IsString() reportType: string;
  @IsOptional() @IsDate() @Type(() => Date) startDate?: Date;
  @IsOptional() @IsDate() @Type(() => Date) endDate?: Date;
  @IsOptional() @IsString() userId?: string;
}

export class DateRangeDto {
  @IsDate() @Type(() => Date) startDate: Date;
  @IsDate() @Type(() => Date) endDate: Date;
}
