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
import {FaqContent} from "./role-faq";
import SellerInventory from "./seller-inventory";
import StockTransfers from "./stock-transfers";
import SellerOrders from "./seller-orders";
const sellerMenus=[{id:"faq",name:"FAQ · Помощь",description:"Как пользоваться кабинетом",icon:UserRound},{id:"transfers",name:"Перемещения",description:"Передача товара между продавцами",icon:Package},{id:"orders",name:"Заказы покупателей",description:"Общая лента и доставка",icon:ShoppingBag},{id:"stock",name:"Мои товары",description:"Наличие и варианты",icon:Package},{id:"revision",name:"Ревизия",description:"Пересчёт и проверка товара",icon:ClipboardCheck},{id:"history",name:"История",description:"Начисления и события",icon:UserRound},{id:"sales",name:"Статистика продаж",description:"Продажи и ваш заработок",icon:BarChart3}];
type Props={initialTab?:string;data:Snapshot;busy:boolean;act:(input:unknown)=>Promise<unknown>};
export default function SellerCabinet({data,busy,act,initialTab="orders"}:Props){
 const [tab,setTab]=useState<string|null>(initialTab==="history"?null:initialTab),[error,setError]=useState("");
 const activeMenu=sellerMenus.find(m=>m.id===tab);
 async function save(input:unknown){try{setError("");await act(input);return true;}catch(e){setError(e instanceof Error?e.message:"Проверьте данные");return false;}}
 return <div className="stack"><div className="eyebrow">ЛИЧНЫЙ КАБИНЕТ ПРОДАВЦА</div><h1>Кабинет продавца</h1><div className="seller-account-grid"><section className="panel seller-card seller-identity" aria-label="Аккаунт продавца"><div className="profile-avatar">{data.me?.photo_url?<img src={data.me.photo_url} alt="Фото профиля"/>:data.me?.first_name.slice(0,1)}</div><div><h2>{data.me?.first_name}</h2><p>@{data.me?.username} · Продавец</p><small>ID {data.me?.id}{data.demoVersion?" · демонстрационный аккаунт":""}</small></div></section><button type="button" className="panel seller-earnings" aria-label="Мой заработок" aria-haspopup="dialog" onClick={()=>setTab("earnings")}><div className="seller-earnings-title"><BarChart3 size={21}/><h3>Мой заработок</h3></div><strong>{money(data.me?.seller_balance||0)}</strong><small>Текущий баланс с учётом штрафов и премий</small><span className="earnings-link">История начислений ↗</span></button></div><WorkspaceInbox data={data} act={act} busy={busy}/><div className="workspace-card-grid seller-menu-grid" aria-label="Разделы кабинета продавца">{sellerMenus.map((m,i)=><button key={m.id} type="button" className={"management-card card-tone-"+(i%4)} aria-haspopup="dialog" onClick={()=>{setTab(m.id);setError("");}}><m.icon size={30}/><strong>{m.name}</strong><small>{m.description}</small><span aria-hidden="true">↗</span></button>)}</div>
 {tab==="earnings"?<Sheet title="Мой заработок" close={()=>setTab(null)}><SellerEarnings data={data}/></Sheet>:null}
 {activeMenu?<Sheet title={activeMenu.name} close={()=>{setTab(null);setError("");}}><div className="stack">{error?<p className="alert error" role="alert">{error}</p>:null}
 {tab==="orders"?<SellerOrders data={data} busy={busy} act={act}/>:null}
 {tab==="stock"?<SellerInventory data={data} sellerId={data.me!.id} act={act} busy={busy}/>:null}
 {tab==="transfers"?<StockTransfers data={data} act={act} busy={busy}/>:null}
 {tab==="faq"?<FaqContent role="seller"/>:null}
 {tab==="revision"?<BlindAudits data={data} act={act} busy={busy}/>:null}
 {tab==="history"?<section className="stack"><h2>Штрафы, премии и уведомления</h2>{data.workspace?.finance.filter(e=>e.seller_id===data.me?.id).toReversed().map(e=><article key={e.id} className="panel stack"><strong>{e.kind==="fine"?"Штраф −":"Премия +"}{money(e.amount)}</strong><p>{e.reason}</p><small>{new Date(e.created_at).toLocaleString("ru-RU")}</small></article>)}{data.workspace?.notices.filter(n=>n.user_id===data.me?.id).toReversed().map(n=><article className="panel stack" key={n.id}><small>{new Date(n.created_at).toLocaleString("ru-RU")} · демоуведомление</small><p className="preserve-lines">{n.text}</p></article>)}</section>:null}
 {tab==="sales"?<Statistics data={data} sellerId={data.me?.id}/>:null}
 </div></Sheet>:null}
 </div>;
}
