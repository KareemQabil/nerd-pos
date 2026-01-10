// Hash Utilities
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md
// Used for ZATCA hash chain

import * as crypto from 'crypto';

export const HashUtils = {
    /**
     * Generate SHA-256 hash
     */
    sha256(data: string): string {
        return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
    },

    /**
     * Generate SHA-256 hash as Base64
     */
    sha256Base64(data: string): string {
        return crypto.createHash('sha256').update(data, 'utf8').digest('base64');
    },

    /**
     * Generate ZATCA invoice hash (XML → SHA256 → Base64)
     */
    zatcaInvoiceHash(invoiceXml: string): string {
        return this.sha256Base64(invoiceXml);
    },

    /**
     * Generate hash chain entry (previousHash + currentData)
     */
    chainHash(previousHash: string | null, currentData: string): string {
        const dataToHash = previousHash ? `${previousHash}${currentData}` : currentData;
        return this.sha256(dataToHash);
    },

    /**
     * Verify hash chain integrity
     */
    verifyChain(previousHash: string | null, currentData: string, expectedHash: string): boolean {
        const computedHash = this.chainHash(previousHash, currentData);
        return computedHash === expectedHash;
    },

    /**
     * Generate random UUID v4
     */
    uuid(): string {
        return crypto.randomUUID();
    },
};
