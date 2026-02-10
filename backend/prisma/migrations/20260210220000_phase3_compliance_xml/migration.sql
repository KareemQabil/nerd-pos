-- Phase 3: Persist invoice XML for ZATCA audit trail

ALTER TABLE "compliance_invoices"
  ADD COLUMN IF NOT EXISTS "xml_content" TEXT;
