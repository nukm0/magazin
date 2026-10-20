import {variantPatch,assertLineStock,takeStock,restoreStock} from "./variants";
import {validateAttributes,validateMeasurements,saveCharacteristic,removeCharacteristic} from "./measurements";
import {DatabaseSync} from "node:sqlite";
import {mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {actionSchema} from "./validation";
import {defaultSettings,type Snapshot,type Profile,type Order,type Product,type Measurement} from "./types";
import {localIdentities,isLocalRequest,assertLocalOrigin} from "./local-mode";

type Entry={order_id?:string;id:string;user_id:string;source:string;amount:number;reason:string;created_at:string};
type LocalOrder=Order & {bonus_spent:number;subtotal:number;purchase_bonus:number;referral_bonus:number};
type State={characteristics?:Measurement[];settings:Snapshot["settings"];ownerId:string;profiles:Record<string,Profile>;categories:Snapshot["categories"];products:Product[];orders:LocalOrder[];ledger:Entry[];media:Record<string,string>};
const initial=():State=>({settings:structuredClone(defaultSettings),ownerId:"998579758",profiles:{},categories:[],products:[],orders:[],ledger:[],media:{}});
const localPayment=z.object({action:z.enum(["localPayment","localRefund"]),id:z.string().uuid()});
export class LocalError extends Error {constructor(public status:number,message:string){super(message);}}
/** A persistent, isolated store used only behind the local development guard. */
export class LocalStore {
 private db:DatabaseSync;
 constructor(path:string){
  if(path!==":memory:")mkdirSync(dirname(path),{recursive:true});
  this.db=new DatabaseSync(path);
  this.db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS local_shop(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);");
  this.db.prepare("INSERT OR IGNORE INTO local_shop(id,data) VALUES(1,?)").run(JSON.stringify(initial()));
 }
 close(){this.db.close();}
 private read():State{return JSON.parse((this.db.prepare("SELECT data FROM local_shop WHERE id=1").get() as {data:string}).data);}
 private change<T>(work:(state:State)=>T):T{
  this.db.exec("BEGIN IMMEDIATE");
  try{const state=this.read(),result=work(state);this.db.prepare("UPDATE local_shop SET data=? WHERE id=1").run(JSON.stringify(state));this.db.exec("COMMIT");return result;}
  catch(e){this.db.exec("ROLLBACK");throw e;}
 }
 private balance(state:State,id:string){return state.ledger.filter(e=>e.user_id===id).reduce((sum,e)=>sum+e.amount,0);}
 private profile(state:State,id:string,referrer?:string):Profile{
  const identity=localIdentities.find(p=>p.id===id);
  if(!identity)throw new LocalError(401,"Неизвестный локальный профиль");
  if(!state.profiles[id])state.profiles[id]={...identity,last_name:"",photo_url:"",role:"buyer",theme:null,balance:0,referred_by:referrer&&referrer!==id&&state.profiles[referrer]?referrer:null};
  const user=state.profiles[id];
  return {...user,role:id===state.ownerId?"owner":user.role==="deputy"?"deputy":"buyer",balance:this.balance(state,id)};
 }
 private image(state:State,value:string){if(!value.startsWith("data:"))return value;const id=randomUUID();state.media[id]=value;return "/api/media/"+id;}
 private credit(state:State,userId:string,amount:number,reason:string,source:string,orderId?:string){
  if(!amount || state.ledger.some(e=>e.source===source))return;
  state.ledger.push({order_id:orderId,id:randomUUID(),user_id:userId,amount,reason,source,created_at:new Date().toISOString()});
 }
 snapshot(id:string,referrer?:string):Snapshot{
  return this.change(state=>{
   const me=this.profile(state,id,referrer),admin=me.role!=="buyer";
   return {local:true,configured:true,settings:state.settings,characteristics:state.characteristics||[],categories:state.categories,products:state.products.filter(p=>p.active||admin),me,
    orders:state.orders.filter(o=>admin||o.user_id===id).slice(-100).reverse(),
    ledger:state.ledger.filter(e=>e.user_id===id).slice(-100).reverse(),referrals:Object.values(state.profiles).filter(p=>p.referred_by===id).length,
    team:admin?Object.values(state.profiles).filter(p=>p.id===state.ownerId||p.role==="deputy").map(p=>this.profile(state,p.id)):[],
    stats:admin?{visitors:Object.keys(state.profiles).length,orders:state.orders.length,paid:state.orders.filter(o=>["paid","shipped","completed"].includes(o.status)).length,revenue:state.orders.filter(o=>["paid","shipped","completed"].includes(o.status)).reduce((n,o)=>n+o.total,0)}:{visitors:0,orders:0,paid:0,revenue:0}};
  });
 }
 media(id:string){return this.read().media[id]||null;}
 mutate(id:string,input:unknown,referrer?:string){
  const special=localPayment.safeParse(input);
  const a=special.success?special.data:actionSchema.parse(input);
  if(a.action==="order"&&a.payment_method==="online")throw new LocalError(409,"Онлайн-оплата пока не подключена. Оплатите при получении.");
  return this.change(state=>{
   const me=this.profile(state,id,referrer),admin=me.role!=="buyer";
   if(a.action==="localPayment" || a.action==="localRefund"){
    const o=state.orders.find(o=>o.id===a.id);
    if(!o || (o.user_id!==id&&!admin))throw new LocalError(404,"Заказ не найден");
    if(a.action==="localPayment"){
     if(["paid","shipped","completed"].includes(o.status))return {ok:true};
     if(o.status!=="pending")throw new LocalError(409,"Этот заказ нельзя оплатить");
     if(this.balance(state,o.user_id)<o.bonus_spent)throw new LocalError(409,"Бонусов для оплаты уже недостаточно");
     takeStock(state.products,o.items);
     o.status="paid";
     this.credit(state,o.user_id,-o.bonus_spent,"Списание за тестовую покупку","spend:"+o.id);
     this.credit(state,o.user_id,o.purchase_bonus,"Бонусы за тестовую покупку","purchase:"+o.id);
     const ref=state.profiles[o.user_id].referred_by;
     if(ref && !state.orders.some(other=>other.id!==o.id&&other.user_id===o.user_id&&["paid","shipped","completed","refunded"].includes(other.status)) && !state.ledger.some(e=>e.source==="referral:"+o.user_id))this.credit(state,ref,o.referral_bonus,"Приглашённый друг: тестовая покупка","referral:"+o.user_id,o.id);
    }else{
     if(!admin)throw new LocalError(403,"Тестовый возврат выполняет владелец или заместитель");
     if(o.status==="refunded")return {ok:true};
     if(!["paid","shipped","completed"].includes(o.status))throw new LocalError(409,"Заказ не оплачен");
     for(const item of o.items){const p=state.products.find(p=>p.id===item.productId);if(p)restoreStock(p,item);}
     for(const entry of [...state.ledger].filter(e=>e.source==="spend:"+o.id||e.source==="purchase:"+o.id))this.credit(state,entry.user_id,-entry.amount,"Возврат тестового заказа","reverse:"+entry.source);
     const referral=state.ledger.find(e=>e.source==="referral:"+o.user_id);
     // Referral reward is tied to the first paid order and is reversed only with that order.
     if(referral && referral.order_id===o.id)this.credit(state,referral.user_id,-referral.amount,"Возврат реферальной награды","reverse:"+referral.source);
     o.status="refunded";
    }
    return {ok:true};
   }
   if(!["theme","order"].includes(a.action)&&!admin)throw new LocalError(403,"Нет доступа к управлению магазином");
   switch(a.action){
    case "image":return {ok:true,url:this.image(state,a.data)};
    case "theme":state.profiles[id].theme=a.theme;break;
    case "settings":state.settings={...a.value,banners:a.value.banners.map(b=>({...b,image_url:this.image(state,b.image_url)}))};break;
    case "characteristic":state.characteristics=saveCharacteristic(state.characteristics||[],a);break;
    case "deleteCharacteristic":state.characteristics=removeCharacteristic(state.characteristics||[],a.key,state.products);break;
    case "category":{
     if(a.parent_id){const parent=state.categories.find(c=>c.id===a.parent_id);if(!parent||parent.parent_id||a.id===a.parent_id)throw new LocalError(400,"Выберите главную категорию");if(a.id&&state.categories.some(c=>c.parent_id===a.id))throw new LocalError(400,"Сначала перенесите подкатегории");}
     const existing=a.id?state.categories.find(c=>c.id===a.id):null;
     if(a.id&&!existing)throw new LocalError(404,"Категория не найдена");
     if(existing)Object.assign(existing,{name:a.name,parent_id:a.parent_id,image_url:a.image_url===undefined?existing?.image_url||"":this.image(state,a.image_url),measurements:validateMeasurements(a.measurements??existing.measurements??[])});else state.categories.push({id:randomUUID(),name:a.name,parent_id:a.parent_id,image_url:this.image(state,a.image_url||""),measurements:validateMeasurements(a.measurements??[])});break;
    }
    case "deleteCategory":if(state.categories.some(c=>c.parent_id===a.id)||state.products.some(p=>p.category_id===a.id))throw new LocalError(409,"Сначала перенесите товары и подкатегории");state.categories=state.categories.filter(c=>c.id!==a.id);break;
    case "product":{
     if(a.category_id&&!state.categories.some(c=>c.id===a.category_id))throw new LocalError(400,"Категория не найдена");
     const p={no_seller_payment:a.no_seller_payment??state.products.find(p=>p.id===a.id)?.no_seller_payment??false,...variantPatch(a,state.products.find(p=>p.id===a.id)),attributes:validateAttributes(state.categories,a.category_id,a.attributes,state.characteristics||[]),id:a.id||randomUUID(),title:a.title,description:a.description,price:a.price,category_id:a.category_id,image_url:this.image(state,a.image_url),active:a.active};
     const index=state.products.findIndex(x=>x.id===a.id);
     if(a.id&&index<0)throw new LocalError(404,"Товар не найден");
     if(index>=0)state.products[index]=p;else state.products.push(p);break;
    }
    case "deleteProduct":{const p=state.products.find(p=>p.id===a.id);if(p)p.active=false;break;}
    case "deputy":
    case "transferOwner":{
     if(a.action==="transferOwner"&&me.role!=="owner")throw new LocalError(403,"Передать магазин может только владелец");
     const target=state.profiles[a.id];
     if(!target)throw new LocalError(400,"Пользователь должен сначала открыть магазин. Выберите тестовый профиль в верхней панели.");
     if(a.action==="deputy"){if(a.id===state.ownerId)throw new LocalError(400,"Нельзя изменить права владельца");target.role=a.enabled?"deputy":"buyer";}
     else{state.profiles[state.ownerId].role="buyer";target.role="buyer";state.ownerId=a.id;}break;
    }
    case "order":{
     const existing=state.orders.find(o=>o.user_id===id&&(o as LocalOrder&{idempotency_key:string}).idempotency_key===a.idempotency_key);if(existing)return {ok:true,orderId:existing.id};
     assertLineStock(state.products,a.items);
     const items=a.items.map(i=>{const p=state.products.find(p=>p.id===i.productId);if(!p||!p.active||p.stock<i.quantity)throw new LocalError(409,"Недостаточно товара");return {...i,title:p.title,price:p.price};});
     const subtotal=items.reduce((sum,i)=>sum+i.quantity*i.price,0);
     if(subtotal>100000000)throw new LocalError(400,"Сумма слишком большая");
     const bonus=z.number().int().nonnegative().parse((input as {spend_bonus?:number}).spend_bonus??0);
     if(bonus>this.balance(state,id)||subtotal-bonus*100<100)throw new LocalError(400,"Недостаточно бонусов или сумма после скидки меньше 1 ₽");
     const total=subtotal-bonus*100;
     const order={id:randomUUID(),payment_method:a.payment_method,user_id:id,items,subtotal,total,bonus_spent:bonus,status:"pending",contact:a.contact,address:a.address,comment:a.comment||"",created_at:new Date().toISOString(),idempotency_key:a.idempotency_key,purchase_bonus:Math.floor(total*state.settings.purchase_percent/10000),referral_bonus:state.settings.referral_reward};
     state.orders.push(order);return {ok:true,orderId:order.id};
    }
    case "orderStatus":{
     const o=state.orders.find(o=>o.id===a.id);
     const allowed:Record<string,string[]>={pending:["cancelled"],paid:["shipped"],shipped:["completed"]};
     if(!o||!allowed[o.status]?.includes(a.status))throw new LocalError(409,"Недоступный переход статуса");o.status=a.status;break;
    }
   }
   return {ok:true};
  });
 }
}
const globalStore=globalThis as unknown as {localMagazin?:LocalStore};
function instance(){return globalStore.localMagazin??=new LocalStore(process.env.LOCAL_STORE_PATH||resolve(process.cwd(),".local","shop.sqlite"));}
function requireLocal(request:Request){if(!isLocalRequest(request))throw new LocalError(403,"Локальный режим недоступен");try{assertLocalOrigin(request);}catch{throw new LocalError(403,"Запрос с другого сайта запрещён");}}
function identity(request:Request){return request.headers.get("x-local-user")||"998579758";}
export function localSnapshot(request:Request){requireLocal(request);return instance().snapshot(identity(request),request.headers.get("x-local-referrer")||undefined);}
export function localMutate(request:Request,input:unknown){requireLocal(request);return instance().mutate(identity(request),input,request.headers.get("x-local-referrer")||undefined);}
export function localMedia(request:Request,id:string){requireLocal(request);return instance().media(id);}