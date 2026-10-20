import type {Snapshot} from "./types";
import {localDay} from "./reports";
import {auditMetrics} from "./audits";
import {crmRemaining} from "./supplies";
export type CrmExpense={date:string;amount:number;title:string};
export function crmReport(s:Snapshot,from:string,to:string,expenses:CrmExpense[]=[],now=Date.now()){
 const start=Date.parse(from+"T00:00:00+03:00"),end=Math.min(now,Date.parse(to+"T23:59:59.999+03:00")),valid=Number.isFinite(start)&&Number.isFinite(end)&&start<=end,inside=(date:string)=>{const t=Date.parse(date);return valid&&t>=start&&t<=end;},dayInside=(date:string)=>inside(date+"T00:00:00+03:00");
 const orders=s.orders.filter(o=>o.status==="completed"&&inside(o.delivered_at||o.created_at)),supplies=(s.workspace?.supplies||[]).filter(b=>dayInside(b.date)),investment=supplies.reduce((n,b)=>n+b.investment,0),tax=supplies.reduce((n,b)=>n+b.tax,0),revenue=orders.reduce((n,o)=>n+o.total,0),units=orders.reduce((n,o)=>n+o.items.reduce((n,i)=>n+i.quantity,0),0);
 let cost=0,payout=0,unknownCosts=0,unknownPayouts=0;for(const o of orders){for(const i of o.items){if(i.unit_cost===null||i.unit_cost===undefined)unknownCosts++;else cost+=i.unit_cost*i.quantity;}const reward=s.sellerEarnings?.find(e=>e.order_id===o.id&&e.seller_id===o.seller_id)?.amount??o.payout_quote?.amount;if(reward!==undefined)payout+=reward;else if(o.seller_id)unknownPayouts++;}
 const premiums=(s.workspace?.finance||[]).filter(e=>e.kind==="premium"&&inside(e.created_at)).reduce((n,e)=>n+e.amount,0),extra=expenses.filter(e=>dayInside(e.date)).reduce((n,e)=>n+e.amount,0),audits=(s.workspace?.audits||[]).filter(a=>a.status==="approved"&&inside(a.approved_at||a.submitted_at||a.created_at)).map(a=>auditMetrics(s,a));let losses=0,unknownLosses=0;for(const a of audits){if(a.lossValue===null)unknownLosses++;else losses+=a.lossValue;}
 // Transfers lack frozen purchase costs in old records; never replace those costs with current prices.
 const disputed=(s.workspace?.transfers||[]).filter(t=>t.decision==="approved"&&inside(t.reviewed_at||t.created_at));unknownLosses+=disputed.filter(t=>t.items.some(i=>(i.bad||0)>0)).length;
 const profit=unknownCosts||unknownPayouts||unknownLosses?null:revenue-cost-payout-premiums-extra-tax-losses,cashReturn=unknownPayouts?null:revenue-payout-premiums-extra-tax-investment;
 const days=valid?Math.max(1,Math.round((Date.parse(to+"T00:00:00+03:00")-start)/86400000)+1):1,rows=[...new Set(orders.map(o=>localDay(new Date(o.delivered_at||o.created_at))))].sort().map(date=>{const list=orders.filter(o=>localDay(new Date(o.delivered_at||o.created_at))===date);return {date,count:list.length,revenue:list.reduce((n,o)=>n+o.total,0)};});
 const stock=s.products.reduce((n,p)=>n+p.stock,0)+(s.workspace?.crmProducts||[]).filter(r=>!r.productId).reduce((n,r)=>n+crmRemaining(s,r),0),stockValue=s.products.reduce((n,p)=>n+p.stock*(p.price+(p.delivery_price||0)),0);
 return {valid,orders,supplies,investment,tax,revenue,units,cost,payout,premiums,extra,losses,unknownCosts,unknownPayouts,unknownLosses,profit,cashReturn,days,rows,stock,stockValue,average:orders.length?Math.round(revenue/orders.length):0,perDay:orders.length/days};
}
