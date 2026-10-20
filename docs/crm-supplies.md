# CRM supplies (preview workspace)

Sequence: categories -> CRM item (name, category, unit purchase cost) -> receipt (quantity, document investment, up to 3 images) -> announcement choosing CRM item.

Receipts freeze category name, purchase cost and tax per unit. Owner sets category tax; deputy may enter receipts but cannot change taxes. Explicit child category zero overrides inherited parent tax. Missing tax defaults to zero. This is an internal management expense, not a statutory tax computation.

Receipt IDs make retries idempotent. Linked receipt quantities increase stock once. Announcements bind one-to-one to CRM items, inherit name/cost/category and must match stock. Variant replenishment requires a known variant. Variant totals on first publication must match receipt quantity. Historical orders and audits retain their previous cost snapshots.

Current stock is the linked announcement stock, including allocated seller inventory. Unlinked CRM stock is total receipts. Items with receipts and zero stock move to history. Receipt depletion is an estimate using FIFO across recorded receipts and present aggregate stock; it is not proof of batch-level physical tracking. New receipts restore current availability.

Investments and tax are displayed separately in the linked CRM area. The older embedded independent financial tables are still separate. Notices are in-app only; real Telegram delivery and shared server persistence of extended workspace features are not connected. Files in preview remain in browser storage and are subject to its quota. Production database migrations are not part of this change.
