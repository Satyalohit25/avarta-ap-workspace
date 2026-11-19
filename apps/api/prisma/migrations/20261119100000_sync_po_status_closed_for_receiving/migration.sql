-- T-305: PurchaseOrder.status is the single source of truth.
-- Sync existing PurchaseOrder rows where closedForReceiving is true to CLOSED_FOR_RECEIVING if still OPEN.
UPDATE "PurchaseOrder"
SET "status" = 'CLOSED_FOR_RECEIVING'
WHERE "closedForReceiving" = true AND "status" = 'OPEN';
