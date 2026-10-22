import type {Snapshot,Order} from "./types";
export function buyerContact(s:Snapshot,o:Order){const frozen=o.buyer_telegram,profile=s.team.find(p=>p.id===o.user_id),raw=frozen?.verified?frozen.username:(o.contact||profile?.username||"").replace(/^@/,""),username=/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(raw)?raw:null,name=frozen?.first_name||profile?.first_name||"Покупатель",text=`Здравствуйте! Я сотрудник магазина «${s.settings.name}». Вы оформили заказ №${o.id.slice(-8)}. Хотел бы уточнить детали заказа, адрес и удобное время доставки.`;return {id:o.user_id,name,photo:frozen?.photo_url||profile?.photo_url||"",verified:!!frozen?.verified&&frozen.id===o.user_id,username,text,url:username?"https://t.me/"+username+"?text="+encodeURIComponent(text):null};}
export function shopBotLink(username:string|undefined){const name=(username||"magazinptz_bot").replace(/^@/,"");return "https://t.me/"+(/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(name)?name:"magazinptz_bot")+"?start=shop";}

export function contactUrl(p:{username:string}|undefined,text:string){return p&&/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(p.username)?"https://t.me/"+p.username+"?text="+encodeURIComponent(text):undefined}

export function sellerContactUrl(p:{id:string;username:string}|undefined,text:string){return contactUrl(p,text)||(p&&/^[1-9]\d{0,15}$/.test(p.id)?"tg://user?id="+p.id:undefined)}
