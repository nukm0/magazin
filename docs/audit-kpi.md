# Variant audits and employee KPI

Seller reports product and optional catalog variant, good units, damaged units and mandatory photo. Known positive seller stock must be represented; found catalog stock may also be declared. Expected counts are hidden in the seller UI. Legacy unallocated variant totals require explicit management allocation first.

Submission freezes expected stock, variant split, product purchase unit cost, completed seller orders and commission/cost snapshots. Approval rejects stale inventory, adjusts good stock by variant and excludes damage from saleable stock. Reserved transfers cannot be consumed by audit adjustments.

Shortage = max(expected - good - damaged, 0). Loss units = shortage + damage. Loss value uses frozen purchase cost; unavailable cost is reported as unknown. Surplus is not income. KPI includes approved audits only: negative if any shortage/damage, otherwise positive if surplus, otherwise neutral. No audits means insufficient data, not a perfect score.

Sales period is after the previous submitted audit up to this submission. Income = completed order total - frozen goods cost - seller reward. Missing historic costs/rewards remain unknown. General business expenses/taxes are not allocated here. Employee totals deduplicate order IDs across audit windows.

Management receives an in-app notice on every submission. Actual bot delivery and production authentication/database transactions remain outside the browser preview implementation.
