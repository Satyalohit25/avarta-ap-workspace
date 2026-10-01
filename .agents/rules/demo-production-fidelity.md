# Demo & Production Fidelity Rule (Avarta AP Workspace)

1. **Preserve Demo Readability & Sales Narrative**:
   - Ensure `pnpm db:seed` and the 5-act demonstration narrative (Clerk intake → AI 3-Way Match → Tiered Approval → Batch Banking → CFO Analytics) remain functional and responsive at all times.
   - Never break reset capabilities or demo persona quick-switches when hardening production paths. Gate simulated rails (e.g. mock UTR generation, simulated ERP adapters) behind explicit flags rather than deleting them.

2. **Zero Client-Side Entity Persistence**:
   - Never persist core business entities (Purchase Order lines, vendor banking particulars, MSME details, approval policies) in browser `localStorage` or component state alone.
   - Every business entity must have a backing Prisma model, migration, and transactional API endpoint.

3. **Strict Financial Calculations & Invariants**:
   - All multi-currency disbursements must be strictly grouped by currency or converted via verified FX rates before computing total debit volume.
   - 3-Way line item matching must compare individual line SKUs and unit prices, not single scalar quantity totals.
   - Idempotency keys must be stable across network retries and generated at the user action level, not randomly per HTTP request.
