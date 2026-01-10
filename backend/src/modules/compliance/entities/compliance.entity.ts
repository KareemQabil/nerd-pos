// Compliance Entities
// Source: FINAL/BACKEND/10-MODULE-COMPLIANCE.md

export interface ZATCAInvoice {
    id: string;
    orderId: string;
    invoiceNumber: string;
    uuid: string;
    previousHash: string;
    currentHash: string;
    invoiceXML: string;
    qrCode: string;
    signedXML?: string | null;
    submissionStatus: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'ERROR';
    submittedAt?: Date | null;
    responseCode?: string | null;
    responseMessage?: string | null;
    createdAt: Date;
}

export interface HashChainStatus {
    lastInvoiceId: string;
    lastHash: string;
    chainValid: boolean;
    totalInvoices: number;
}
