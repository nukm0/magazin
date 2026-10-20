import {supplyActions,supplyMutation,bindCrmProduct} from "./supplies";
import {reservedStock,transferActions,transferMutation} from "./transfers";
import {variantPatch} from "./variants";
import {initWorkspace,expiry} from "./workspace";
import {workspaceActions,workspaceMutation} from "./workspace-mutations";
import {validateAttributes,validateMeasurements,saveCharacteristic,removeCharacteristic} from "./measurements";
import {sellerMutation} from "./seller-demo";
import {publicCatalog} from "./catalog";
import {actionSchema} from "./validation";
import {defaultSettings,type Snapshot} from "./types";
export function blankPreview():Snapshot{return {settings:structuredClone(defaultSettings),products:[],categories:[],me:{id:"998579758",first_name:"Владелец",last_name:"",username:"",photo_url:"",role:"owner",theme:null,referred_by:null,balance:0},orders:[],ledger:[],referrals:0,team:[],stats:{visitors:0,orders:0,paid:0,revenue:0},configured:true};}
export function previewMutation(state:Snapshot,input:unknown):Snapshot{
 state=expiry(structuredClone(state));
 if(input&&typeof input==="object"&&"action" in input&&supplyActions.has(String(input.action)))return supplyMutation(state,input);
 if(input&&typeof input==="object"&&"action" in input&&transferActions.has(String(input.action)))return transferMutation(state,input);
 if(input&&typeof input==="object"&&"action" in input&&input.action==="refreshDemo")return state;
 if(input&&typeof input==="object"&&"action" in input&&workspaceActions.has(String(input.action)))return workspaceMutation(state,input);
 if(input&&typeof input==="object"&&"action" in input&&["claimOrder","returnOrder","acceptOrder","deliverOrder","inventoryReview","stockReceipt","demoOrder"].includes(String(input.action)))return sellerMutation(state,input);
 const a=actionSchema.parse(input),s=withPreviewProfiles(structuredClone(state));
 if(!s.me)throw new Error("Выберите аккаунт");
 if(a.action==="transferOwner"&&s.me.role!=="owner")throw new Error("Управлять доступом может только владелец");
 if(!["theme","order"].includes(a.action)&&s.me.role==="buyer")throw new Error("У покупателя нет доступа к управлению магазином");
 if(s.me.role==="seller"&&a.action!=="theme")throw new Error("Продавцу доступны учёт товаров и работа с заказами");
 switch(a.action){
 case "characteristic":s.characteristics=saveCharacteristic(s.characteristics||[],a);break;
 case "deleteCharacteristic":s.characteristics=removeCharacteristic(s.characteristics||[],a.key,s.products);break;
 case "image":break;
 case "settings":s.settings=a.value;break;
 case "theme":if(s.me)s.me.theme=a.theme;break;
 case "product":{a.attributes=validateAttributes(s.categories,a.category_id,a.attributes,s.characteristics||[]);const old=s.products.find(p=>p.id===a.id);const p={...a,no_seller_payment:a.no_seller_payment??old?.no_seller_payment??false,unit_cost:a.unit_cost===undefined?old?.unit_cost:a.unit_cost,...variantPatch(a,old),id:a.id||crypto.randomUUID(),seller_id:old?.seller_id||s.me.id,sku:old?.sku||"SKU-"+crypto.randomUUID().slice(0,8).toUpperCase()};if(s.sellerStocks?.some(r=>r.productId===p.id&&reservedStock(s,r.seller_id,p.id)>0)){const allocated=s.sellerStocks.filter(r=>r.productId===p.id).reduce((n,r)=>n+r.quantity,0);if(p.stock<allocated)throw new Error("Товар находится в перемещении: нельзя уменьшить склад ниже распределённого остатка");for(const r of s.sellerStocks.filter(r=>r.productId===p.id))for(const [variant,quantity] of Object.entries(r.variants||{})){if(reservedStock(s,r.seller_id,p.id,variant)>0&&(!p.variants.includes(variant)||(p.variant_stocks.find(v=>v.name===variant)?.stock||0)<quantity))throw new Error("Нельзя удалить или уменьшить вариант активного перемещения");}}bindCrmProduct(s,p,old);s.products=s.products.filter(x=>x.id!==p.id).concat(p);break;}
 case "deleteProduct":s.products=s.products.map(p=>p.id===a.id?{...p,active:false}:p);break;
 case "category":{
 if(a.parent_id && (a.parent_id===a.id || s.categories.find(c=>c.id===a.parent_id)?.parent_id))throw new Error("Выберите главную категорию");
 if(a.parent_id && a.id && s.categories.some(c=>c.parent_id===a.id))throw new Error("Сначала перенесите подкатегории");
 const c={id:a.id||crypto.randomUUID(),name:a.name,parent_id:a.parent_id,image_url:a.image_url??s.categories.find(c=>c.id===a.id)?.image_url??"",measurements:validateMeasurements(a.measurements??s.categories.find(c=>c.id===a.id)?.measurements??[])};s.categories=s.categories.filter(x=>x.id!==c.id).concat(c);break;
 }
 case "deleteCategory":if(s.categories.some(c=>c.parent_id===a.id)||s.products.some(p=>p.category_id===a.id)||s.workspace?.crmProducts?.some(p=>p.category_id===a.id))throw new Error("Категория используется");s.categories=s.categories.filter(c=>c.id!==a.id);break;
 case "transferOwner":{const target=s.team.find(p=>p.id===a.id);if(!target)throw new Error("Пользователь не найден в предпросмотре");if(target.id===s.me.id)break;for(const p of s.team)if(p.role==="owner")p.role="buyer";target.role="owner";s.me.role="buyer";break;}
 case "deputy":{const target=s.team.find(p=>p.id===a.id);if(!target)throw new Error("Для проверки используйте ID тестового покупателя или заместителя из переключателя аккаунтов");if(target.role==="owner")throw new Error("Нельзя изменить права владельца");target.role=a.enabled?"deputy":"buyer";if(target.id===s.me.id)s.me.role=target.role;break;}
 case "order":throw new Error("В предпросмотре заказы не отправляются. Подключите Telegram и базу данных.");
 case "orderStatus":if(s.demoVersion)throw new Error("Заказ обрабатывает закреплённый продавец в своём кабинете");s.orders=s.orders.map(o=>o.id===a.id?{...o,status:a.status}:o);break;
 }
 s.team=s.team.map(p=>p.id===s.me!.id?structuredClone(s.me!):p);
 return s;
}

export function catalogPreview():Snapshot{const s=blankPreview();s.settings=structuredClone(publicCatalog.settings);s.categories=structuredClone(publicCatalog.categories);s.products=structuredClone(publicCatalog.products);s.me!.first_name="нукмо";s.me!.username="nukm0";return s;}

export const previewRoleNames={owner:"Владелец",buyer:"Покупатель",deputy:"Зам владельца",seller:"Продавец"} as const;
export function withPreviewProfiles(s:Snapshot):Snapshot{
 if(!s.team.length){const owner={...blankPreview().me!,first_name:"нукмо",username:"nukm0"};s.team=[owner,{...owner,id:"100000001",first_name:"Тестовый покупатель",username:"local_buyer",role:"buyer"},{...owner,id:"100000002",first_name:"Тестовый заместитель",username:"local_deputy",role:"deputy"}];if(s.me)s.team=s.team.map(p=>p.id===s.me!.id?structuredClone(s.me!):p);}
 if(!s.team.some(p=>p.id==="100000003"))s.team.push({...blankPreview().me!,id:"100000003",first_name:"Анна",username:"mide_seller",role:"seller"});
 if(!s.team.some(p=>p.id==="100000004"))s.team.push({...blankPreview().me!,id:"100000004",first_name:"Михаил",username:"mide_seller_2",role:"seller"});
 return s;
}
export function switchPreviewProfile(state:Snapshot,id:string):Snapshot{const s=withPreviewProfiles(structuredClone(state));if(s.me)s.team=s.team.map(p=>p.id===s.me!.id?structuredClone(s.me!):p);const next=s.team.find(p=>p.id===id);if(!next)throw new Error("Аккаунт не найден");s.me=structuredClone(next);return s;}

export function prepareDemo(s:Snapshot):Snapshot{
 s=initWorkspace(withPreviewProfiles(s));
 if((s.catalogRevision||0)<3){s.products=[];s.categories=[];s.characteristics=[];s.orders=[];s.sellerStocks=[];s.orderEvents=[];s.sellerEarnings=[];s.inventoryReviews=[];s.dailyVisits=[];s.stats={visitors:0,orders:0,paid:0,revenue:0};const w=s.workspace!;w.audits=[];w.rates=[];w.complaints=[];w.reviewedEvents=[];w.bonusRules=[];w.notices=w.notices.filter(n=>!(/^(new-|claimed:|returned-|accepted:|delivered-|expired:|audit|complaint|cashback:|rule:)/.test(n.source)));for(const p of s.team)if(p.role==="seller")p.seller_balance=w.finance.filter(f=>f.seller_id===p.id).reduce((n,f)=>n+(f.kind==="fine"?-f.amount:f.amount),0);if(s.me?.role==="seller")s.me.seller_balance=s.team.find(p=>p.id===s.me!.id)?.seller_balance||0;s.demoVersion=2;s.catalogRevision=3;}
 s.characteristics??=[];return expiry(s);
}
