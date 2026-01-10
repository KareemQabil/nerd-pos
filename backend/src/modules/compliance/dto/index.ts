// Compliance DTOs
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class GenerateInvoiceDto {
    @IsUUID() orderId: string;
}

export class SubmitInvoiceDto {
    @IsUUID() invoiceId: string;
}

export class VerifyHashChainDto {
    @IsOptional() @IsString() startDate?: string;
    @IsOptional() @IsString() endDate?: string;
}
