"use client";
import {useState} from "react";
import type {Snapshot} from "@/lib/types";
import {money} from "@/lib/format";
import WorkspaceInbox from "./workspace-inbox";
import BlindAudits from "./blind-audits";
import Statistics from "./statistics";
import SellerOrders from "./seller-orders";
type Props={initialTab?:string;data:Snapshot;busy:boolean;act:(input:unknown)=>Promise<unknown>};
export default function SellerCabinet({data,busy,act,initialTab="orders"}:Props){
 const [tab,setTab]=useState(initialTab),[error,setError]=useState("");
 const [count,setCount]=useState<{productId:string;title:string;expected:number;actual:string}[]|null>(null);
 const own=data.products.filter(p=>data.sellerStocks?.some(i=>i.productId===p.id&&i.seller_id===data.me?.id)).map(p=>({...p,stock:data.sellerStocks!.find(i=>i.productId===p.id&&i.seller_id===data.me?.id)!.quantity})),units=own.reduce((n,p)=>n+p.stock,0);
 async function save(input:unknown){try{setError("");await act(input);return true;}catch(e){setError(e instanceof Error?e.message:"Проверьте данные");return false;}}
 return <div className="stack"><div className="eyebrow">ЛИЧНЫЙ КАБИНЕТ ПРОДАВЦА</div><h1>Кабинет продавца</h1><WorkspaceInbox data={data} act={act} busy={busy}/><section className="panel seller-card"><div className="profile-avatar">{data.me?.first_name.slice(0,1)}</div><div><h2>{data.me?.first_name}</h2><p>@{data.me?.username} · Продавец</p><small>ID {data.me?.id} · демонстрационный аккаунт</small></div><div><small>Баланс продавца</small><h2>{money(data.me?.seller_balance||0)}</h2><small>Заработок, штрафы и премии · демо</small></div></section><div className="admin-nav">{[{id:"orders",name:"Заказы покупателей"},{id:"stock",name:"Мои товары"},{id:"revision",name:"Ревизия"},{id:"history",name:"Профиль и история"},{id:"sales",name:"Статистика продаж"}].map(t=><button key={t.id} onClick={()=>{setTab(t.id);setError("");}} className={tab===t.id?"active":""}>{t.name}</button>)}</div>{error?<p className="alert error" role="alert">{error}</p>:null}
 {tab==="orders"?<SellerOrders data={data} busy={busy} act={act}/>:null}
 {tab==="stock"?<><div className="stats-grid"><div className="panel stat-card"><span>Моих объявлений</span><strong>{own.length}</strong></div><div className="panel stat-card"><span>Остаток, шт.</span><strong>{units}</strong></div><div className="panel stat-card"><span>Стоимость по цене продажи</span><strong>{money(own.reduce((n,p)=>n+p.stock*p.price,0))}</strong></div></div><div className="section-heading"><h2>Товары в наличии</h2></div>
 {own.map(p=><section className="panel stack" key={p.id}><div className="manage-row">{p.image_url?<img src={p.image_url} alt={p.title}/>:null}<div className="row-main"><h3>{p.title}</h3><small>{p.sku||p.id} · {p.active?"Опубликовано":"Скрыто"}</small></div><strong>{money(p.price)}</strong></div><p>Сейчас на складе: <strong>{p.stock} шт.</strong></p><div className="two-col"><form className="stack" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);if(await save({action:"stockReceipt",id:crypto.randomUUID(),productId:p.id,quantity:Number(f.get("quantity")),note:String(f.get("note"))}))form.reset();}}><h3>Поступление</h3><label>Количество<input name="quantity" aria-label={"Поступление: "+p.title} type="number" min="1" max="1000000" required defaultValue="1"/></label><label>Основание<input name="note" required maxLength={500} placeholder="Например, поставка №15"/></label><button className="secondary" disabled={busy}>Принять на склад</button></form></div></section>)}{!own.length?<p>На вашем складе пока нет товаров. Обратитесь к владельцу.</p>:null}</>:null}
 {tab==="revision"?<BlindAudits data={data} act={act} busy={busy}/>:null}
 {tab==="history"?<section className="stack"><h2>Штрафы, премии и уведомления</h2>{data.workspace?.finance.filter(e=>e.seller_id===data.me?.id).toReversed().map(e=><article key={e.id} className="panel stack"><strong>{e.kind==="fine"?"Штраф −":"Премия +"}{money(e.amount)}</strong><p>{e.reason}</p><small>{new Date(e.created_at).toLocaleString("ru-RU")}</small></article>)}{data.workspace?.notices.filter(n=>n.user_id===data.me?.id).toReversed().map(n=><article className="panel stack" key={n.id}><small>{new Date(n.created_at).toLocaleString("ru-RU")} · демоуведомление</small><p className="preserve-lines">{n.text}</p></article>)}</section>:null}
 {tab==="sales"?<Statistics data={data} sellerId={data.me?.id}/>:null}
 </div>;
}
