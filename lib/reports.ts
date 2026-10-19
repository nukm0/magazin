import type {Snapshot} from "./types";
export const localDay=(date:Date)=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Moscow"}).format(date);
export function report(data:Snapshot,from:string,to:string,sellerId?:string,now=Date.now()){
 const start=Date.parse(from+"T00:00:00+03:00"),end=Math.min(now,Date.parse(to+"T23:59:59.999+03:00")),valid=Number.isFinite(start)&&Number.isFinite(end)&&start<=end;
 const orderDate=(o:Snapshot["orders"][number])=>sellerId&&o.status==="completed"?(o.delivered_at||data.sellerEarnings?.find(e=>e.order_id===o.id&&e.seller_id===sellerId)?.created_at||o.created_at):o.created_at;
 const orders=data.orders.filter(o=>valid&&(!sellerId||o.seller_id===sellerId)&&Date.parse(orderDate(o))>=start&&Date.parse(orderDate(o))<=end);
 const completed=orders.filter(o=>o.status==="completed"),paid=orders.filter(o=>["paid","completed","shipped"].includes(o.status));
 const income=(orderId:string)=>data.sellerEarnings?.find(e=>e.order_id===orderId&&e.seller_id===sellerId)?.amount??data.orders.find(o=>o.id===orderId)?.payout_quote?.amount??0;
 const value=(list:typeof orders)=>list.reduce((n,o)=>n+(sellerId?income(o.id):o.total),0);
 const revenue=value(sellerId?completed:paid),days=valid?Math.max(1,Math.floor((Date.parse(to+"T00:00:00+03:00")-start)/86400000)+1):1;
 const visits=valid?(data.dailyVisits||[]).filter(d=>d.date>=from&&d.date<=to&&d.date<=localDay(new Date(now))).reduce((n,d)=>n+d.visitors,0):0;
 const rows=Array.from(new Set([...orders.map(o=>localDay(new Date(orderDate(o)))),...(sellerId?[]:(data.dailyVisits||[]).filter(d=>valid&&d.date>=from&&d.date<=to&&d.date<=localDay(new Date(now))).map(d=>d.date))])).sort().map(date=>{const all=orders.filter(o=>localDay(new Date(orderDate(o)))===date),done=all.filter(o=>o.status==="completed");return {date,orders:all.length,sales:done.length,revenue:value(sellerId?done:all.filter(o=>["paid","completed","shipped"].includes(o.status))),visits:data.dailyVisits?.find(d=>d.date===date)?.visitors||0};});
 const sellerCost=(data.sellerEarnings||[]).filter(e=>paid.some(o=>o.id===e.order_id)).reduce((n,e)=>n+e.amount,0);
 return {shopIncome:revenue-sellerCost,valid,orders,completed,paid,revenue,days,visits,rows,average:(sellerId?completed:paid).length?Math.round(revenue/(sellerId?completed:paid).length):0,perDay:completed.length/days,cancelled:orders.filter(o=>o.status==="cancelled").length,inProgress:orders.filter(o=>["delivering","shipped"].includes(o.status)).length,units:completed.reduce((n,o)=>n+o.items.reduce((n,i)=>n+i.quantity,0),0)};
}
