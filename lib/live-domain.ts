import type {Snapshot,Profile} from './types';
import {previewMutation} from './demo';import {sellerMutation} from './seller-demo';import {workspaceActions} from './workspace-mutations';import {supplyActions} from './supplies';import {transferActions} from './transfers';import {withdrawalActions} from './withdrawals';import {actionSchema} from './validation';import {initWorkspace,expiry} from './workspace';import {orderCreatedMessage} from './bot-messages';
const catalogActions=new Set(['settings','category','deleteCategory','characteristic','deleteCharacteristic','product','deleteProduct','theme','deputy']);
const sellerActions=new Set(['claimOrder','returnOrder','acceptOrder','deliverOrder']);
export function liveDomain(state:Snapshot,input:unknown,identity:Profile):Snapshot{
 if(!input||typeof input!=='object'||!('action' in input))throw new Error('Не указано действие');const raw=structuredClone(input) as Record<string,unknown>,action=String(raw.action),person=state.team.find(p=>p.id===identity.id);if(!person)throw new Error('Откройте магазин через Telegram');let s=expiry(initWorkspace(structuredClone(state)));s.live=true;delete s.demoVersion;s.me=structuredClone(person);const admin=['owner','deputy'].includes(person.role);
 if(['loadClothingDemo','refreshDemo','demoOrder','localPayment','selfAudit','inventoryReview','stockReceipt','orderStatus','transferOwner'].includes(action))throw new Error('Это действие недоступно в рабочем магазине');
 if(action==='assignRole'){const target=String(raw.target||'').replace(/^@/,'').toLowerCase();if(!s.team.some(p=>p.id===target||p.username.toLowerCase()===target))throw new Error('Пользователь должен сначала открыть магазин через Telegram');}
 if(action==='order'){
  const a=actionSchema.parse(input);if(a.action!=='order')throw new Error('Некорректный заказ');if(person.role!=='buyer')throw new Error('Заказ создаёт только покупатель');const previous=s.orders.find(o=>o.id===a.idempotency_key);if(previous){if(previous.user_id!==person.id)throw new Error('Нет доступа к заказу');return s;}
  if(s.orders.some(o=>o.user_id===person.id&&Date.now()-Date.parse(o.created_at)<60000))throw new Error('Подождите минуту перед следующим заказом');
  s=sellerMutation(s,{...raw,action:'demoOrder',id:a.idempotency_key,contact:person.username?'@'+person.username:a.contact});const o=s.orders.find(o=>o.id===a.idempotency_key)!;o.buyer_telegram={id:person.id,first_name:person.first_name,username:person.username,photo_url:person.photo_url,verified:true};
  for(const n of s.workspace!.notices.filter(n=>n.user_id===person.id&&n.source.includes(o.id)))n.text=orderCreatedMessage(s.settings.name,o.id,o.total,o.items);return s;
 }
 if(person.role==='buyer'&&!['theme','complainOrder','readNotices'].includes(action))throw new Error('Нет доступа к управлению магазином');
 if(!admin&&person.role==='seller'&&!sellerActions.has(action)&&!['readNotices','submitAudit'].includes(action)&&!transferActions.has(action)&&action!=='requestWithdrawal')throw new Error('Нет доступа к управлению магазином');
 if(!(catalogActions.has(action)||workspaceActions.has(action)||supplyActions.has(action)||transferActions.has(action)||withdrawalActions.has(action)||sellerActions.has(action)))throw new Error('Неизвестное действие');
 if(action==='settings'&&person.role!=='owner'&&String((raw.value as Partial<Snapshot['settings']>)?.rental_description||'')!==String(s.settings.rental_description||''))throw new Error('Условия аренды меняет только владелец');
 if(action==='product'){const old=s.products.find(p=>p.id===raw.id);if(!raw.crm_id&&!old?.crm_id)throw new Error('Сначала добавьте товар и поставку в CRM');delete raw.unit_cost;}
 s=previewMutation(s,raw);s.live=true;delete s.demoVersion;
 if(action==='shopStyle')s.settings.logo_url=s.workspace?.logo||'';
 if(action==='settings'&&s.settings.logo_url!==undefined)s.workspace!.logo=s.settings.logo_url;
 return s;
}
export function publicLiveState(full:Snapshot,me:Profile|null):Snapshot{
 const s=initWorkspace(structuredClone(full));s.live=true;delete s.demoVersion;s.telegram_verified=!!me;s.me=me?structuredClone(s.team.find(p=>p.id===me.id)||me):null;const admin=!!s.me&&['owner','deputy'].includes(s.me.role),seller=s.me?.role==='seller',id=s.me?.id,w=s.workspace!;
 if(admin)return s;
 s.products=s.products.filter(p=>p.active&&(seller||p.stock>0)).map(p=>{const copy={...p};delete copy.unit_cost;delete copy.crm_id;delete copy.no_seller_payment;return copy});
 s.orders=s.orders.filter(o=>seller?(o.status==='open'||o.seller_id===id):o.user_id===id).map(o=>{const copy=structuredClone(o);for(const i of copy.items)delete i.unit_cost;if(!seller||copy.status!=="completed")delete copy.payout_quote;if(seller&&copy.seller_id!==id){copy.user_id='';copy.contact='';copy.address=copy.address.split(',')[0].slice(0,80);copy.comment='';delete copy.buyer_telegram;delete copy.payout_quote;}return copy});
 s.orderEvents=(s.orderEvents||[]).filter(e=>seller&&e.seller_id===id).map(e=>({...e,reason:''}));s.sellerEarnings=(s.sellerEarnings||[]).filter(e=>seller&&e.seller_id===id);s.sellerStocks=(s.sellerStocks||[]).filter(r=>seller&&r.seller_id===id);s.inventoryReviews=[];s.dailyVisits=[];s.stats={visitors:0,orders:0,paid:0,revenue:0};
 s.team=s.team.filter(p=>p.id===id||seller&&p.role==='seller').map(p=>p.id===id?p:{...p,photo_url:'',personal:undefined,balance:0,seller_balance:0});
 w.visits=[];w.contacts=seller&&id&&w.contacts[id]?{[id]:w.contacts[id]}:{};w.rates=[];w.finance=w.finance.filter(r=>r.seller_id===id);w.crmProducts=[];w.supplies=[];w.taxRates={};w.expenses=[];w.activity=[];w.withdrawals=(w.withdrawals||[]).filter(r=>r.seller_id===id);w.complaints=(w.complaints||[]).filter(r=>r.buyer_id===id);w.bonuses=w.bonuses.filter(r=>r.user_id===id);w.notices=w.notices.filter(r=>r.user_id===id);
 w.audits=w.audits.filter(a=>seller&&a.seller_id===id).map(a=>({...a,stock_snapshot:undefined,sales:undefined,items:a.items.map(i=>({...i,expected:0,unit_cost:undefined}))}));w.transfers=(w.transfers||[]).filter(t=>seller&&[t.from,t.to].includes(id||''));
 if(!me){s.team=[];s.orders=[];w.withdrawals=[];w.finance=[];w.bonuses=[];w.notices=[];}
 return s;
}
