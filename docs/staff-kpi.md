# Composite staff KPI

Owner/deputy only. CRM -> Employees shows a period-filtered team comparison. Seller profile has a General KPI button; audit-only details remain available separately.

Weights: financial contribution 40, units sold 20, execution 20, stock quality 20. Contribution = completed-order revenue minus frozen purchase cost, frozen reward/earnings, premiums and known approved audit losses. General shop expenses and receipt taxes are not attributed without an allocation rule. Fines are shown separately and are not treated as cash income or an extra loss.

Financial and sales parts are normalized against the best current team result in the same period. Negative contribution scores zero. Execution uses distinct completed orders divided by completed plus returned orders (a return followed by completion by the same seller within the period is counted once). Current in-progress orders are not failures. Quality is the pass ratio of approved audits without shortage/damage and settled outgoing transfers without upheld defects. Pending transfers do not lower the quality score. Upheld defective transfers lack frozen loss cost in old records: the finance component is unavailable rather than estimating historical cost from today.

Unavailable components are excluded and available weights are rescaled. Such scores carry a preliminary badge and coverage percentage. No activity means no score. Leader requires completed orders and known positive contribution. Buyer complaints are informational because reviewed does not mean upheld in the current schema. Former sellers with historical data remain visible. The rating is comparative, not an absolute employee evaluation; changing period or team results changes normalized scores.
