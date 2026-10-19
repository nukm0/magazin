# Seller inventory and transfers

Preview mode uses the existing browser workspace and write lock. No fixtures are seeded.
Seller stock retains product totals with optional per-variant counts. Legacy totals with unknown variants must be explicitly redistributed by management; the UI never invents variant quantities.

A seller creates a transfer with item/variant quantities and a shipping photo. Quantities are reserved until cancellation or settlement. Recipient accepts and chooses sender/recipient as carrier. Sender confirms physical handover; only then may recipient confirm receipt with a photo and description.

Good quantities move immediately on receipt. Disputed quantities stay reserved at source pending management review. Approving the complaint writes off disputed units from source and global stock as damaged; rejecting credits them to recipient. Review is idempotent and stores the decision, reviewer, timestamp and comment. Photo evidence and line-specific reasons are retained.

Sender, recipient and management can cancel before handover. Recipient sees Decline. History is retained; cancellation after handover is rejected, since undoing physical movement needs a return rather than silent deletion.

Notifications are workspace notices. Actual Telegram delivery and server-persisted multi-user inventory are not configured in this demo; no bot messages are sent by this feature. Use server authentication, transactions, per-variant inventory and photo storage before production use.
