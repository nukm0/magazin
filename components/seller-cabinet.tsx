"use client";
import {useState} from "react";
import {ShoppingBag,Package,ClipboardCheck,UserRound,BarChart3} from "lucide-react";
import {Sheet} from "./workspace-ui";
import type {Snapshot} from "@/lib/types";
import {money} from "@/lib/format";
import WorkspaceInbox from "./workspace-inbox";
import BlindAudits from "./blind-audits";
import Statistics from "./statistics";
import SellerEarnings from "./seller-earnings";
import SellerOrders from "./seller-orders";
const sellerMenus=[{id:"orders",name:"Заказы покупателей",description:"Общая лента и доставка",icon:ShoppingBag},{id:"stock",name:"Мои товары",description:"Остатки и поступления",icon:Package},{id:"revision",name:"Ревизия",description:"Пересчёт и проверка товара",icon:ClipboardCheck},{id:"history",name:"Профиль и история",description:"Штрафы, премии и события",icon:UserRound},{id:"sales",name:"Статистика продаж",description:"Продажи и ваш заработок",icon:BarChart3}];
type Props={initialTab?:string;data:Snapshot;busy:boolean;act:(input:unknown)=>Promise<unknown>};
export default function SellerCabinet({data,busy,act,initialTab="orders"}:Props){
 const [tab,setTab]=useState<string|null>(initialTab==="history"?null:initialTab),[error,setError]=useState("");
 const activeMenu=sellerMenus.find(m=>m.id===tab);
 const own=data.products.filter(p=>data.sellerStocks?.some(i=>i.productId===p.id&&i.seller_id===data.me?.id)).map(p=>({...p,stock:data.sellerStocks!.find(i=>i.productId===p.id&&i.seller_id===data.me?.id)!.quantity})),units=own.reduce((n,p)=>n+p.stock,0);
 async function save(input:unknown){try{setError("");await act(input);return true;}catch(e){setError(e instanceof Error?e.message:"Проверьте данные");return false;}}
 return <div className="stack"><div className="eyebrow">ЛИЧНЫЙ КАБИНЕТ ПРОДАВЦА</div><h1>Кабинет продавца</h1><div className="seller-account-grid"><section className="panel seller-card seller-identity" aria-label="Аккаунт продавца"><div className="profile-avatar">{data.me?.photo_url?<img src={data.me.photo_url} alt="Фото профиля"/>:data.me?.first_name.slice(0,1)}</div><div><h2>{data.me?.first_name}</h2><p>@{data.me?.username} · Продавец</p><small>ID {data.me?.id}{data.demoVersion?" · демонстрационный аккаунт":""}</small></div></section><button type="button" className="panel seller-earnings" aria-label="Мой заработок" aria-haspopup="dialog" onClick={()=>setTab("earnings")}><div className="seller-earnings-title"><BarChart3 size={21}/><h3>Мой заработок</h3></div><strong>{money(data.me?.seller_balance||0)}</strong><small>Текущий баланс с учётом штрафов и премий</small><span className="earnings-link">История начислений ↗</span></button></div><WorkspaceInbox data={data} act={act} busy={busy}/><div className="workspace-card-grid seller-menu-grid" aria-label="Разделы кабинета продавца">{sellerMenus.map((m,i)=><button key={m.id} type="button" className={"management-card card-tone-"+(i%4)} aria-haspopup="dialog" onClick={()=>{setTab(m.id);setError("");}}><m.icon size={30}/><strong>{m.name}</strong><small>{m.description}</small><span aria-hidden="true">↗</span></button>)}</div>
 {tab==="earnings"?<Sheet title="Мой заработок" close={()=>setTab(null)}><SellerEarnings data={data}/></Sheet>:null}
 {activeMenu?<Sheet title={activeMenu.name} close={()=>{setTab(null);setError("");}}><div className="stack">{error?<p className="alert error" role="alert">{error}</p>:null}
 {tab==="orders"?<SellerOrders data={data} busy={busy} act={act}/>:null}
 {tab==="stock"?<><div className="stats-grid"><div className="panel stat-card"><span>Моих объявлений</span><strong>{own.length}</strong></div><div className="panel stat-card"><span>Остаток, шт.</span><strong>{units}</strong></div><div className="panel stat-card"><span>Стоимость по цене продажи</span><strong>{money(own.reduce((n,p)=>n+p.stock*p.price,0))}</strong></div></div><div className="section-heading"><h2>Товары в наличии</h2></div>
 {own.map(p=><section className="panel stack" key={p.id}><div className="manage-row">{p.image_url?<img src={p.image_url} alt={p.title}/>:null}<div className="row-main"><h3>{p.title}</h3><small>{p.sku||p.id} · {p.active?"Опубликовано":"Скрыто"}</small></div><strong>{money(p.price)}</strong></div><p>Сейчас на складе: <strong>{p.stock} шт.</strong></p><div className="two-col"><form className="stack" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);if(await save({action:"stockReceipt",id:crypto.randomUUID(),productId:p.id,quantity:Number(f.get("quantity")),note:String(f.get("note"))}))form.reset();}}><h3>Поступление</h3><label>Количество<input name="quantity" aria-label={"Поступление: "+p.title} type="number" min="1" max="1000000" required defaultValue="1"/></label><label>Основание<input name="note" required maxLength={500} placeholder="Например, поставка №15"/></label><button className="secondary" disabled={busy}>Принять на склад</button></form></div></section>)}{!own.length?<p>На вашем складе пока нет товаров. Обратитесь к владельцу.</p>:null}</>:null}
 {tab==="revision"?<BlindAudits data={data} act={act} busy={busy}/>:null}
 {tab==="history"?<section className="stack"><h2>Штрафы, премии и уведомления</h2>{data.workspace?.finance.filter(e=>e.seller_id===data.me?.id).toReversed().map(e=><article key={e.id} className="panel stack"><strong>{e.kind==="fine"?"Штраф −":"Премия +"}{money(e.amount)}</strong><p>{e.reason}</p><small>{new Date(e.created_at).toLocaleString("ru-RU")}</small></article>)}{data.workspace?.notices.filter(n=>n.user_id===data.me?.id).toReversed().map(n=><article className="panel stack" key={n.id}><small>{new Date(n.created_at).toLocaleString("ru-RU")} · демоуведомление</small><p className="preserve-lines">{n.text}</p></article>)}</section>:null}
 {tab==="sales"?<Statistics data={data} sellerId={data.me?.id}/>:null}
 </div></Sheet>:null}
 </div>;
}
