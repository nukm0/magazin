# CRM supplies (preview workspace)

Sequence: categories -> CRM item (name, category, unit purchase cost) -> receipt (quantity, document investment, up to 3 images) -> announcement choosing CRM item.

Receipts freeze category name, purchase cost and tax per unit. Owner sets category tax; deputy may enter receipts but cannot change taxes. Explicit child category zero overrides inherited parent tax. Missing tax defaults to zero. This is an internal management expense, not a statutory tax computation.

Receipt IDs make retries idempotent. Linked receipt quantities increase stock once. Announcements bind one-to-one to CRM items, inherit name/cost/category and must match stock. Variant replenishment requires a known variant. Variant totals on first publication must match receipt quantity. Historical orders and audits retain their previous cost snapshots.

Current stock is the linked announcement stock, including allocated seller inventory. Unlinked CRM stock is total receipts. Items with receipts and zero stock move to history. Receipt depletion is an estimate using FIFO across recorded receipts and present aggregate stock; it is not proof of batch-level physical tracking. New receipts restore current availability.

Investments and tax are displayed separately in the linked CRM area. The older embedded independent financial tables are still separate. Notices are in-app only; real Telegram delivery and shared server persistence of extended workspace features are not connected. Files in preview remain in browser storage and are subject to its quota. Production database migrations are not part of this change.

## Linked CRM overview

The Overview card now reads shop snapshot supplies, completed orders by completion time (Moscow), frozen order purchase costs, seller earnings/frozen payout quotes, premiums and approved audit losses. Manual expenses are read from the existing `magazin-crm-empty-v3` expense list when the overview opens. Existing expense records are preserved. Missing historical costs, commissions or loss valuation yield an explicitly incomplete profit instead of substituting present-day prices. Old transfer complaints do not have frozen loss costs and are also marked incomplete.

Profit subtracts sold cost, seller rewards, premiums, manual expenses, supply tax and recognized losses. Investment is shown separately and is not deducted twice. Cash remainder subtracts investment instead of sold cost, and excludes noncash loss adjustments. These are management accounting indicators, not bank reconciliation. Fines are not treated as collected cash. Legacy Customers/Orders/Expenses screens are still separate; only Overview has been replaced with linked statistics in this change.

## Remaining-stock forecast

Overview now has a separate forecast independent of the historical date filter. Gross revenue uses current global remaining stock multiplied by announcement buyer totals (product price plus delivery). Purchase cost uses CRM current cost, falling back to the stored product cost. Each active seller's current allocated stock is valued using the shared payout function and current rate priorities, including no-payment flags. Completed earnings are not mixed into this future projection.

Unallocated stock gets a commission reserve range across active sellers, and that range is deducted from forecast profit. Without active sellers the current store/default payout policy is used. Stock over-allocation, missing purchase costs or unlisted CRM stock prevent presenting a complete net profit. Manual expenses, recorded supply tax and premiums through today are deducted once as all-time overhead; existing purchase investment is not subtracted a second time. Forecast figures are not added to actual historical profit. In-delivery items are already removed from current stock and are excluded. Future discounts, redemptions and new expenses are not predicted.
