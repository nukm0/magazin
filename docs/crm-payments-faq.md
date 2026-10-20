# CRM products, checkout methods and help

Management → CRM → Add product accepts a name and unit purchase price; an existing announcement may be linked immediately or later. A linked announcement supplies sale price/delivery, and its unit cost is updated for new orders/audits. No new sales announcement or sample stock is seeded. Historic order and audit costs are unchanged.

Commission precedence: store product → store category/parent → individual seller product → individual seller category/parent. Zero is an explicit override. A lower product commission is not replaced by a larger seller commission. Quotes remain frozen on acceptance into delivery.

Checkout supports cash-on-delivery creation. Online selection shows an unavailable message and creates nothing. Online is rejected in preview, local and database order handlers. Apply the SQL migration before using a configured database; no migration is run by this change.

Role-specific FAQ is available from buyer/management profiles and seller menu. It documents current preview limitations, including browser persistence and unconfigured Telegram delivery.
