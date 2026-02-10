// Compliance Entities
// Source: FINAL/BACKEND/10-MODULE-COMPLIANCE.md
// Aligned with: prisma/schema.prisma

// ==================== INVOICE COMPLIANCE ====================

export interface InvoiceCompliance {
  id: string;
  orderId: string;
  uuid?: string;
  hash?: string; // SHA-256 hash
  invoiceHash?: string; // ComplianceInvoice alias
  currentHash?: string; // Backward-compatible alias for hash
  previousHash?: string | null; // Hash chain
  signature?: string | null; // Digital signature
  publicKey?: string | null; // Certificate public key
  xmlContent?: string | null; // Full UBL 2.1 XML
  qrCodeData?: string; // Base64 TLV
  submittedAt?: Date | null;
  clearanceStatus?: string | null; // CLEARED, REJECTED, REPORTED
  clearanceId?: string | null; // ZATCA clearance ID
  etaUuid?: string | null;
  etaSubmittedAt?: Date | null;
  etaStatus?: string | null;
  createdAt?: Date;

  // Backward-compatible aliases for service
  invoiceNumber?: string; // Alias for orderId/uuid
  submissionStatus?: string; // Alias for clearanceStatus
  qrCode?: string; // Alias for qrCodeData
  invoiceXML?: string; // Alias for xmlContent
  signedXML?: string | null; // Alias for signature
  responseCode?: string | null; // For API responses
  responseMessage?: string | null; // For API responses
}

// Backward-compatible alias
export type ZATCAInvoice = InvoiceCompliance;

// ==================== COMPLIANCE SETTINGS ====================

export interface ComplianceSettings {
  id: string;
  zatcaCsid?: string | null; // Compliance CSID
  zatcaSecret?: string | null; // API secret
  zatcaCertificate?: string | null; // X.509 certificate
  zatcaPrivateKey?: string | null; // Private key
  etaClientId?: string | null;
  etaClientSecret?: string | null;
  etaTaxId?: string | null;
  country: string; // SA, EG
  vatNumber: string;
  crNumber: string; // Commercial registration
  isProduction: boolean;
  updatedAt: Date;
}

// ==================== HASH CHAIN STATUS ====================

export interface HashChainStatus {
  lastInvoiceId: string;
  lastHash: string;
  chainValid: boolean;
  totalInvoices: number;
  brokenAtInvoiceId?: string;
  expectedHash?: string;
  actualHash?: string;
}
