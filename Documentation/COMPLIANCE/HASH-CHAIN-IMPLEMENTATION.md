# ZATCA Hash Chain Implementation

**Requirement**: Cryptographic invoice sequence  
**Authority**: ZATCA (Saudi Arabia)  
**Critical**: Chain MUST NEVER be broken  

---

## **CONCEPT**

Hash chain creates tamper-proof invoice sequence:

```
Invoice 1 → Hash A
Invoice 2 → Hash B (includes Hash A)
Invoice 3 → Hash C (includes Hash B)
...
```

If ANY invoice is modified, the entire chain breaks.

---

## **IMPLEMENTATION**

### **1. Calculate Hash**

```typescript
// Calculate SHA-256 hash
import * as crypto from 'crypto';

function calculateInvoiceHash(
  xmlContent: string,
  previousHash: string
): string {
  // Concatenate current invoice + previous hash
  const data = xmlContent + previousHash;
  
  // SHA-256 hash
  const hash = crypto
    .createHash('sha256')
    .update(data, 'utf8')
    .digest('hex');
  
  return hash;
}
```

### **2. First Invoice**

```typescript
// First invoice has no previous hash
const GENESIS_HASH = '0'.repeat(64); // 64 zeros

const firstInvoice = {
  uuid: '8e66147c-d671-4474-9b2e-b5d469fd4e3f',
  xmlContent: '<Invoice>...</Invoice>'
};

const firstHash = calculateInvoiceHash(
  firstInvoice.xmlContent,
  GENESIS_HASH
);

console.log(firstHash);
// Output: a3f5e8c2d9b1... (64 characters)
```

### **3. Subsequent Invoices**

```typescript
// Second invoice includes first hash
const secondInvoice = {
  uuid: '7a55047d-c570-4363-8a1f-a4d358ed3e2e',
  xmlContent: '<Invoice>...</Invoice>'
};

const secondHash = calculateInvoiceHash(
  secondInvoice.xmlContent,
  firstHash // Previous hash
);

// Third invoice includes second hash
const thirdHash = calculateInvoiceHash(
  thirdInvoice.xmlContent,
  secondHash // Previous hash
);
```

---

## **DATABASE STORAGE**

```prisma
model InvoiceCompliance {
  id            String   @id @default(uuid())
  
  orderId       String   @unique
  uuid          String   @unique
  
  // Hash chain
  hash          String   // Current invoice hash
  previousHash  String   // Previous invoice hash
  
  // XML content (for recalculation)
  xmlContent    String   @db.Text
  
  // Sequence number
  sequenceNumber Int     @default(autoincrement())
  
  createdAt     DateTime @default(now())
  
  @@index([sequenceNumber])
  @@index([hash])
}
```

---

## **SERVICE IMPLEMENTATION**

```typescript
// compliance.service.ts
import Decimal from 'decimal.js';
import * as crypto from 'crypto';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly complianceRepo: InvoiceComplianceRepository,
    private readonly orderRepo: OrderRepository
  ) {}

  async generateCompliantInvoice(orderId: string): Promise<InvoiceCompliance> {
    const order = await this.orderRepo.findById(orderId);
    
    // Generate UUID
    const uuid = crypto.randomUUID();
    
    // Get previous hash
    const previousInvoice = await this.complianceRepo.findLatest();
    const previousHash = previousInvoice?.hash || this.getGenesisHash();
    
    // Generate XML
    const xmlContent = await this.generateUBLXML(order, uuid);
    
    // Calculate hash
    const hash = this.calculateHash(xmlContent, previousHash);
    
    // Get next sequence number
    const sequenceNumber = await this.getNextSequenceNumber();
    
    // Save to database
    const compliance = await this.complianceRepo.create({
      orderId,
      uuid,
      hash,
      previousHash,
      xmlContent,
      sequenceNumber
    });
    
    return compliance;
  }

  private calculateHash(xmlContent: string, previousHash: string): string {
    const data = xmlContent + previousHash;
    
    return crypto
      .createHash('sha256')
      .update(data, 'utf8')
      .digest('hex');
  }

  private getGenesisHash(): string {
    return '0'.repeat(64);
  }

  private async getNextSequenceNumber(): Promise<number> {
    const latest = await this.complianceRepo.findLatest();
    return latest ? latest.sequenceNumber + 1 : 1;
  }

  // Verify hash chain integrity
  async verifyHashChain(): Promise<{
    valid: boolean;
    brokenAt?: number;
    message: string;
  }> {
    const invoices = await this.complianceRepo.findAll({
      orderBy: { sequenceNumber: 'asc' }
    });

    if (invoices.length === 0) {
      return {
        valid: true,
        message: 'No invoices to verify'
      };
    }

    // Check first invoice
    const firstInvoice = invoices[0];
    if (firstInvoice.previousHash !== this.getGenesisHash()) {
      return {
        valid: false,
        brokenAt: 1,
        message: 'First invoice does not have genesis hash'
      };
    }

    // Verify first invoice hash
    const firstRecalculated = this.calculateHash(
      firstInvoice.xmlContent,
      firstInvoice.previousHash
    );

    if (firstRecalculated !== firstInvoice.hash) {
      return {
        valid: false,
        brokenAt: 1,
        message: 'First invoice hash mismatch'
      };
    }

    // Check remaining chain
    for (let i = 1; i < invoices.length; i++) {
      const current = invoices[i];
      const previous = invoices[i - 1];

      // Check if previous hash matches
      if (current.previousHash !== previous.hash) {
        return {
          valid: false,
          brokenAt: i + 1,
          message: `Invoice ${i + 1} previousHash does not match previous invoice hash`
        };
      }

      // Recalculate current hash
      const recalculatedHash = this.calculateHash(
        current.xmlContent,
        current.previousHash
      );

      if (recalculatedHash !== current.hash) {
        return {
          valid: false,
          brokenAt: i + 1,
          message: `Invoice ${i + 1} hash mismatch (tampered content)`
        };
      }
    }

    return {
      valid: true,
      message: `Hash chain verified successfully (${invoices.length} invoices)`
    };
  }

  // Recovery: Rebuild hash chain from sequence
  async rebuildHashChain(): Promise<void> {
    const invoices = await this.complianceRepo.findAll({
      orderBy: { sequenceNumber: 'asc' }
    });

    let previousHash = this.getGenesisHash();

    for (const invoice of invoices) {
      // Recalculate hash
      const newHash = this.calculateHash(invoice.xmlContent, previousHash);

      // Update invoice
      await this.complianceRepo.update(invoice.id, {
        previousHash,
        hash: newHash
      });

      previousHash = newHash;
    }

    console.log(`Rebuilt hash chain for ${invoices.length} invoices`);
  }
}
```

---

## **CRITICAL SCENARIOS**

### **Scenario 1: Server Crash During Invoice**

```typescript
// Use database transaction
async generateCompliantInvoice(orderId: string): Promise<InvoiceCompliance> {
  return this.prisma.$transaction(async (tx) => {
    // Get previous hash (with lock)
    const previousInvoice = await tx.invoiceCompliance.findFirst({
      orderBy: { sequenceNumber: 'desc' },
      select: { hash: true }
    });
    
    const previousHash = previousInvoice?.hash || this.getGenesisHash();
    
    // Generate XML
    const xmlContent = await this.generateUBLXML(order, uuid);
    
    // Calculate hash
    const hash = this.calculateHash(xmlContent, previousHash);
    
    // Insert (atomic operation)
    const compliance = await tx.invoiceCompliance.create({
      data: {
        orderId,
        uuid,
        hash,
        previousHash,
        xmlContent
      }
    });
    
    return compliance;
  });
}
```

### **Scenario 2: Concurrent Invoice Generation**

```typescript
// Use distributed lock (Redis)
async generateCompliantInvoice(orderId: string): Promise<InvoiceCompliance> {
  const lockKey = 'invoice:generation:lock';
  const lock = await this.redis.lock(lockKey, 5000); // 5 second lock

  try {
    const compliance = await this._generateCompliantInvoice(orderId);
    return compliance;
  } finally {
    await lock.release();
  }
}
```

### **Scenario 3: Database Corruption**

```typescript
// Backup hash chain to S3/file storage
async backupHashChain(): Promise<void> {
  const invoices = await this.complianceRepo.findAll({
    orderBy: { sequenceNumber: 'asc' }
  });

  const backup = {
    timestamp: new Date().toISOString(),
    count: invoices.length,
    lastHash: invoices[invoices.length - 1]?.hash,
    invoices: invoices.map(inv => ({
      sequenceNumber: inv.sequenceNumber,
      uuid: inv.uuid,
      hash: inv.hash,
      previousHash: inv.previousHash,
      createdAt: inv.createdAt
    }))
  };

  // Save to S3
  await this.s3.putObject({
    Bucket: 'zatca-backups',
    Key: `hash-chain-${Date.now()}.json`,
    Body: JSON.stringify(backup, null, 2)
  });
}

// Run daily backup
@Cron('0 0 * * *') // Midnight daily
async dailyBackup() {
  await this.backupHashChain();
}
```

---

## **TESTING**

```typescript
describe('Hash Chain', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = new ComplianceService(repo);
  });

  it('should generate correct hash for first invoice', async () => {
    const invoice = await service.generateCompliantInvoice('order-1');
    
    // Previous hash should be genesis
    expect(invoice.previousHash).toBe('0'.repeat(64));
    
    // Hash should be SHA-256 (64 chars)
    expect(invoice.hash).toHaveLength(64);
    
    // Recalculate and verify
    const recalculated = service.calculateHash(
      invoice.xmlContent,
      invoice.previousHash
    );
    expect(recalculated).toBe(invoice.hash);
  });

  it('should chain subsequent invoices correctly', async () => {
    const invoice1 = await service.generateCompliantInvoice('order-1');
    const invoice2 = await service.generateCompliantInvoice('order-2');
    
    // Second invoice should reference first
    expect(invoice2.previousHash).toBe(invoice1.hash);
  });

  it('should verify valid chain', async () => {
    // Generate 3 invoices
    await service.generateCompliantInvoice('order-1');
    await service.generateCompliantInvoice('order-2');
    await service.generateCompliantInvoice('order-3');
    
    const result = await service.verifyHashChain();
    
    expect(result.valid).toBe(true);
  });

  it('should detect tampered invoice', async () => {
    // Generate invoices
    const invoice = await service.generateCompliantInvoice('order-1');
    
    // Tamper with XML
    await repo.update(invoice.id, {
      xmlContent: '<Invoice>TAMPERED</Invoice>'
    });
    
    const result = await service.verifyHashChain();
    
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
  });
});
```

---

## **MONITORING**

```typescript
// Schedule verification
@Cron('0 */6 * * *') // Every 6 hours
async verifyChainJob() {
  const result = await this.verifyHashChain();
  
  if (!result.valid) {
    // CRITICAL ALERT
    await this.alertService.sendCritical({
      type: 'HASH_CHAIN_BROKEN',
      message: result.message,
      brokenAt: result.brokenAt
    });
    
    // Log to audit
    await this.auditService.log({
      event: 'HASH_CHAIN_VIOLATION',
      severity: 'CRITICAL',
      details: result
    });
  }
}
```

---

## **KEY POINTS**

1. **Genesis Hash**: First invoice uses 64 zeros
2. **Sequential**: Invoices must be created in sequence
3. **Atomic**: Use transactions to prevent race conditions
4. **Immutable**: Never modify existing invoices
5. **Backup**: Daily backups of hash chain
6. **Verification**: Periodic chain verification
7. **Recovery**: Rebuild capability (emergency only)

---

**⚠️ CRITICAL**: Breaking the hash chain invalidates ALL subsequent invoices and violates ZATCA compliance!
