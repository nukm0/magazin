import {publicCatalog} from "./catalog";
import {actionSchema} from "./validation";
import {defaultSettings,type Snapshot} from "./types";
export function blankPreview():Snapshot{return {settings:structuredClone(defaultSettings),products:[],categories:[],me:{id:"998579758",first_name:"Владелец",last_name:"",username:"",photo_url:"",role:"owner",theme:null,referred_by:null,balance:0},orders:[],ledger:[],referrals:0,team:[],stats:{visitors:0,orders:0,paid:0,revenue:0},configured:true};}
export function previewMutation(state:Snapshot,input:unknown):Snapshot{
 const a=actionSchema.parse(input),s=structuredClone(state);
 switch(a.action){
 case "image":break;
 case "settings":s.settings=a.value;break;
 case "theme":if(s.me)s.me.theme=a.theme;break;
 case "product":{const p={...a,id:a.id||crypto.randomUUID()};s.products=s.products.filter(x=>x.id!==p.id).concat(p);break;}
 case "deleteProduct":s.products=s.products.map(p=>p.id===a.id?{...p,active:false}:p);break;
 case "category":{
 if(a.parent_id && (a.parent_id===a.id || s.categories.find(c=>c.id===a.parent_id)?.parent_id))throw new Error("Выберите главную категорию");
 if(a.parent_id && a.id && s.categories.some(c=>c.parent_id===a.id))throw new Error("Сначала перенесите подкатегории");
 const c={id:a.id||crypto.randomUUID(),name:a.name,parent_id:a.parent_id};s.categories=s.categories.filter(x=>x.id!==c.id).concat(c);break;
 }
 case "deleteCategory":if(s.categories.some(c=>c.parent_id===a.id)||s.products.some(p=>p.category_id===a.id))throw new Error("Категория используется");s.categories=s.categories.filter(c=>c.id!==a.id);break;
 case "transferOwner":throw new Error("Передача магазина доступна после подключения Telegram и базы данных");
 case "deputy":throw new Error("Назначение реальных пользователей доступно после подключения Telegram и базы данных");
 case "order":throw new Error("В предпросмотре заказы не отправляются. Подключите Telegram и базу данных.");
 case "orderStatus":s.orders=s.orders.map(o=>o.id===a.id?{...o,status:a.status}:o);break;
 }
 return s;
}

export function catalogPreview():Snapshot{const s=blankPreview();s.settings=structuredClone(publicCatalog.settings);s.categories=structuredClone(publicCatalog.categories);s.products=structuredClone(publicCatalog.products);s.me!.first_name="нукмо";s.me!.username="nukm0";return s;}
