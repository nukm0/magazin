"use client";
import {useState} from "react";
import type {Snapshot} from "@/lib/types";
import {money,statusName} from "@/lib/format";
const labels={claimed:"Взял заказ",returned:"Вернул в общую ленту",accepted:"Принял в доставку",delivered:"Товар доставлен · заказ закрыт"};
export default function OrderLog({data}:{data:Snapshot}){
 const [from,setFrom]=useState(""),[to,setTo]=useState("");
 if(!["owner","deputy"].includes(data.me?.role||""))return null;
 const orders=data.orders.filter(o=>(!from||o.created_at.slice(0,10)>=from)&&(!to||o.created_at.slice(0,10)<=to)).toReversed();
 return <section className="stack"><h2>Заказы и журнал действий продавцов</h2><p>Причины возврата доступны только владельцу и заместителю. Возврат в ленту не отменяет заказ покупателя.</p><div className="date-filters"><label>Заказы с<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Заказы по<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>{orders.map(o=><article key={o.id} className="panel stack"><div className="section-heading"><h3>#{o.id.slice(-8)}</h3><span className="status">{statusName[o.status]}</span></div><p>{o.items.map(i=>i.title+" ×"+i.quantity).join(", ")}</p><p>Итого: {money(o.total)} · Доставка / заработок продавца: {money(o.delivery_fee||0)}</p><p>Покупатель: {o.contact} · {o.address}</p><small>Закреплён за: {data.team.find(p=>p.id===o.seller_id)?.first_name||"не закреплён"}</small>{(data.orderEvents||[]).filter(e=>e.order_id===o.id).map(e=><div className="audit-event" key={e.id}><strong>{labels[e.type]}</strong><small>{new Date(e.created_at).toLocaleString("ru-RU")} · {data.team.find(p=>p.id===e.seller_id)?.first_name} · ID {e.seller_id}</small>{e.reason?<p>Причина: {e.reason}</p>:null}</div>)}</article>)}{!orders.length?<p>За выбранный период заказов нет.</p>:null}</section>;
}
