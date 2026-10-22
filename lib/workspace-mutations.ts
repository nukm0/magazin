import {fillAudit,approveAuditStock,auditMetrics} from "./audits";
import {reservedStock} from "./transfers";
import {canComplain,complaintReasons} from "./buyer";
import {z} from "zod";
import type {Snapshot} from "./types";
import {initWorkspace,syncProfile,notify,manualBonus} from "./workspace";
const id=z.string().uuid(),short=z.string().trim().max(1000),amount=z.number().int().nonnegative().max(100000000),image=z.string().max(2800000).refine(v=>!v||(/^https:\/\//.test(v)||/^\/api\/media\/[0-9a-f-]{36}$/.test(v))||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),"Нужно изображение PNG, JPEG, WebP или HTTPS-ссылка"),accent=z.enum(["purple","blue","pink","red","mono"]);
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("readNotices"),ids:z.array(id).max(1000)}),
 z.object({action:z.literal("complainOrder"),id,order_id:id,reason:z.enum(complaintReasons),comment:short.min(3)}),
 z.object({action:z.literal("reviewComplaint"),id}),
 z.object({action:z.literal("selfAudit"),id}),
 z.object({action:z.literal("allocateStock"),seller_id:z.string(),productId:id,variant:z.string().trim().min(1).max(80).optional(),quantity:amount}),
 z.object({action:z.literal("personalStyle"),value:z.object({background:accent,glow:accent,text:z.enum(["white","black"]),image})}),
 z.object({action:z.literal("shopStyle"),name:z.string().trim().min(1).max(80),description:short,logo:image,background:image,block_color:z.string().regex(/^(#[0-9a-fA-F]{6})?$/).optional(),accent,glow:accent,text:z.enum(["white","black"]).optional(),owner_gray:z.boolean().optional()}),
 z.object({action:z.literal("bannerStyle"),id,accent,imageOnly:z.boolean()}),
 z.object({action:z.literal("productVariants"),id,variants:z.array(z.string().trim().min(1).max(80)).max(30)}),
 z.object({action:z.literal("assignRole"),target:z.string().trim().min(1).max(64),role:z.enum(["buyer","seller","deputy"]),name:z.string().trim().max(80),phone:short,vk:short,address:short,photo:image}),
 z.object({action:z.literal("financeEntry"),id,seller_id:z.string(),kind:z.enum(["fine","premium"]),amount:amount.positive(),reason:short.min(3),order_event:id.optional()}),
 z.object({action:z.literal("reviewReturn"),event_id:id}),
 z.object({action:z.literal("crmProduct"),id,name:z.string().trim().min(1).max(150),productId:id.nullable(),unit_cost:amount}),
 z.object({action:z.literal("setRate"),scope:z.enum(["product","category","seller","sellerProduct"]),target_id:z.string(),seller_id:z.string(),amount}),
 z.object({action:z.literal("deleteRate"),id}),
 z.object({action:z.literal("requestAudit"),id,seller_id:z.string(),note:short}),
 z.object({action:z.literal("requestAllAudits"),id,note:short}),
 z.object({action:z.literal("remindAudit"),id,note:short}),
 z.object({action:z.literal("submitAudit"),id,note:short,photo:image.min(1),items:z.array(z.object({productId:id,variant:z.string().trim().min(1).max(80).optional(),good:amount,damaged:amount})).min(1).max(500)}),
 z.object({action:z.literal("approveAudit"),id}),
 z.object({action:z.literal("returnAudit"),id,note:short.min(3)}),
 z.object({action:z.literal("deleteAudit"),id}),
 z.object({action:z.literal("rewardSettings"),kind:z.enum(["fixed","percent"]),value:amount,limit:z.number().int().positive().max(1000000).nullable(),purchase_percent:z.number().min(0).max(100)}),
 z.object({action:z.literal("bonusRule"),mode:z.enum(["two_categories","same_category"]).optional(),reward:z.enum(["bonus","discount"]).optional(),id,name:short.min(1),kind:z.enum(["fixed","percent"]),value:amount,requirements:z.array(z.object({category_id:z.string(),product_id:z.string(),quantity:z.number().int().min(1).max(1000)})).min(1).max(10)}),
 z.object({action:z.literal("deleteBonusRule"),id}),
 z.object({action:z.literal("manualBonus"),id,target:z.string().trim().min(1),amount:amount.positive(),reason:short.min(3)}),
 z.object({action:z.literal("notificationSettings"),enabled:z.boolean()})
]);
export const workspaceActions=new Set(["complainOrder","readNotices","reviewComplaint","personalStyle","shopStyle","bannerStyle","productVariants","assignRole","financeEntry","reviewReturn","setRate","deleteRate","requestAudit","remindAudit","submitAudit","approveAudit","rewardSettings","bonusRule","deleteBonusRule","manualBonus","notificationSettings","selfAudit","allocateStock","returnAudit","deleteAudit","requestAllAudits","crmProduct"]);
export function workspaceMutation(state:Snapshot,input:unknown):Snapshot{
 const parsed=schema.safeParse(input);if(!parsed.success)throw new Error("Проверьте обязательные поля, суммы и формат изображений");
 const a=parsed.data,s=initWorkspace(structuredClone(state)),w=s.workspace!,me=s.me;if(!me)throw new Error("Войдите в аккаунт");const admin=["owner","deputy"].includes(me.role),now=new Date().toISOString();
 if(a.action==="readNotices"){for(const n of w.notices)if(n.user_id===me.id&&a.ids.includes(n.id)&&!n.read_at)n.read_at=now;return s;}
 if(a.action==="complainOrder"){
 if(me.role!=="buyer")throw new Error("Жалобу может подать покупатель");
 const o=s.orders.find(o=>o.id===a.order_id&&o.user_id===me.id);if(!o)throw new Error("Заказ не найден");
 if(w.complaints!.some(c=>c.order_id===o.id&&c.buyer_id===me.id))return s;
 if(!canComplain(o))throw new Error("Жалобу можно подать в течение 24 часов после доставки");
 w.complaints!.push({id:a.id,order_id:o.id,buyer_id:me.id,seller_id:o.seller_id||null,reason:a.reason,comment:a.comment,created_at:now,status:"new"});
 for(const p of s.team.filter(p=>["owner","deputy"].includes(p.role)))notify(s,p.id,"Жалоба на заказ #"+o.id.slice(-8)+" от @"+me.username+". "+a.reason+": "+a.comment,"complaint:"+a.id,true);
 notify(s,me.id,"Жалоба на заказ #"+o.id.slice(-8)+" передана владельцу и заместителю.","complaint-confirm:"+a.id,true);return s;
 }
 if(a.action==="personalStyle"){me.personal=a.value;syncProfile(s,me);return s;}
 if(a.action==="selfAudit")throw new Error("Ревизию назначает только владелец или заместитель");
 if(a.action==="submitAudit"){
 const r=w.audits.find(r=>r.id===a.id&&r.seller_id===me.id);if(me.role!=="seller"||!r)throw new Error("Ревизия не найдена");if(r.status!=="pending")throw new Error("Ревизия уже отправлена");
 fillAudit(s,r,a.items,now);r.photo=a.photo;r.note+=(a.note?"\nКомментарий продавца: "+a.note:"");r.status="submitted";r.submitted_at=now;
 const report=auditMetrics(s,r);for(const p of s.team.filter(p=>["owner","deputy"].includes(p.role)))notify(s,p.id,`Ревизия @${me.username} сдана. Брак: ${report.damaged} шт.; недостача: ${report.shortage} шт.; излишек: ${report.surplus} шт.`,"audit-submit:"+r.id+":"+now,true);return s;
 }
 if(!admin)throw new Error("Доступно владельцу и заместителю");
 switch(a.action){
 case "reviewComplaint":{const c=w.complaints!.find(c=>c.id===a.id);if(!c)throw new Error("Жалоба не найдена");c.status="reviewed";c.reviewed_at=now;break;}
 case "allocateStock":{const p=s.products.find(p=>p.id===a.productId);if(!p||!s.team.some(p=>p.id===a.seller_id&&p.role==="seller"))throw new Error("Выберите товар и продавца");s.sellerStocks??=[];const own=s.sellerStocks.find(r=>r.productId===p.id&&r.seller_id===a.seller_id),others=s.sellerStocks.filter(r=>r.productId===p.id&&r.seller_id!==a.seller_id);let variants=own?.variants,quantity=a.quantity;if(p.variants?.length){if(!a.variant||!p.variants.includes(a.variant))throw new Error("Выберите вариант");variants={...own?.variants,[a.variant]:a.quantity};quantity=Object.values(variants).reduce((n,q)=>n+q,0);if(a.quantity<reservedStock(s,a.seller_id,p.id,a.variant))throw new Error("Товар зарезервирован в перемещении");const total=others.reduce((n,r)=>n+(r.variants?.[a.variant!]||0),0)+a.quantity;if(total>(p.variant_stocks?.find(v=>v.name===a.variant)?.stock??p.stock))throw new Error("Недостаточно выбранного варианта на складе");}else if(a.variant)throw new Error("У товара нет вариантов");if(quantity<reservedStock(s,a.seller_id,p.id))throw new Error("Товар зарезервирован в перемещении");if(others.reduce((n,r)=>n+r.quantity,0)+quantity>p.stock)throw new Error("Недостаточно свободного товара на складе магазина");s.sellerStocks=s.sellerStocks.filter(r=>r!==own).concat({seller_id:a.seller_id,productId:p.id,quantity,...(variants?{variants}:{})});break;}
 case "shopStyle":if(a.owner_gray!==undefined&&me.role!=="owner"&&a.owner_gray!==!!w.ownerGray)throw new Error("Серый фон кабинета настраивает только владелец");if(a.text!==undefined){w.text=a.text;w.appearanceEnabled=true;}if(a.owner_gray!==undefined)w.ownerGray=a.owner_gray;s.settings.name=a.name;s.settings.description=a.description;w.logo=a.logo;w.background=a.background;if(a.block_color!==undefined)w.blockColor=a.block_color;w.accent=a.accent;w.glow=a.glow;break;
 case "bannerStyle":if(!s.settings.banners.some(b=>b.id===a.id))throw new Error("Баннер не найден");w.bannerStyles[a.id]={accent:a.accent,imageOnly:a.imageOnly};break;
 case "productVariants":{const p=s.products.find(p=>p.id===a.id);if(!p)throw new Error("Товар не найден");if(p.variant_stocks?.length)throw new Error("Измените варианты и их остатки в объявлении");p.variants=[...new Set(a.variants)];break;}
 case "assignRole":{const key=a.target.replace(/^@/,"").toLowerCase();let p=s.team.find(p=>p.id===key||p.username.toLowerCase()===key);if(p?.role==="owner")throw new Error("Нельзя изменить роль владельца");if(p?.role==="seller"&&s.orders.some(o=>o.seller_id===p!.id&&["claimed","delivering"].includes(o.status)))throw new Error("Сначала завершите заказы продавца");if(!p){if(!/^[1-9]\d{0,15}$/.test(key)&&!/^\w{5,32}$/.test(key))throw new Error("Укажите Telegram ID или username");p={id:/^\d+$/.test(key)?key:String(Date.now()),first_name:a.name||key,last_name:"",username:/^\d+$/.test(key)?"":key,photo_url:a.photo,role:a.role,theme:null,referred_by:null,balance:0,seller_balance:0};s.team.push(p);}p.role=a.role;if(a.name)p.first_name=a.name;if(a.role==="seller"){w.contacts[p.id]={phone:a.phone,vk:a.vk,address:a.address,photo:a.photo};if(a.photo)p.photo_url=a.photo;}syncProfile(s,p);notify(s,p.id,"Ваша роль изменена: "+a.role,"role:"+p.id+":"+now);break;}
 case "financeEntry":{if(w.finance.some(e=>e.id===a.id))break;const p=s.team.find(p=>p.id===a.seller_id&&p.role==="seller");if(!p)throw new Error("Продавец не найден");if(a.order_event){const e=s.orderEvents?.find(e=>e.id===a.order_event&&e.type==="returned"&&e.seller_id===p.id);if(!e||w.reviewedEvents.includes(e.id))throw new Error("Возврат уже рассмотрен");w.reviewedEvents.push(e.id);}w.finance.push({...a,created_at:now,actor_id:me.id});p.seller_balance=(p.seller_balance||0)+(a.kind==="fine"?-a.amount:a.amount);syncProfile(s,p);notify(s,p.id,`${a.kind==="fine"?"Штраф":"Премия"}: ${a.amount/100} ₽. ${a.reason}`,"finance:"+a.id);break;}
 case "reviewReturn":if(!s.orderEvents?.some(e=>e.id===a.event_id&&e.type==="returned"))throw new Error("Возврат не найден");if(!w.reviewedEvents.includes(a.event_id))w.reviewedEvents.push(a.event_id);break;
 case "crmProduct":{const p=a.productId?s.products.find(p=>p.id===a.productId):null;if(a.productId&&!p)throw new Error("Объявление не найдено");w.crmProducts??=[];if(a.productId&&w.crmProducts.some(r=>r.id!==a.id&&r.productId===a.productId))throw new Error("Это объявление уже добавлено в CRM");const old=w.crmProducts.find(r=>r.id===a.id),record={id:a.id,productId:a.productId,name:a.name,unit_cost:a.unit_cost,created_at:old?.created_at||now,updated_at:now};w.crmProducts=w.crmProducts.filter(r=>r.id!==a.id).concat(record);if(p)p.unit_cost=a.unit_cost;break;}
 case "setRate":{if(["product","sellerProduct"].includes(a.scope)?!s.products.some(p=>p.id===a.target_id):!s.categories.some(c=>c.id===a.target_id))throw new Error("Выберите товар или категорию");if(["seller","sellerProduct"].includes(a.scope)&&!s.team.some(p=>p.id===a.seller_id&&p.role==="seller"))throw new Error("Выберите продавца");w.rates=w.rates.filter(r=>!(r.scope===a.scope&&r.target_id===a.target_id&&r.seller_id===a.seller_id));w.rates.push({...a,id:crypto.randomUUID()});break;}
 case "deleteRate":w.rates=w.rates.filter(r=>r.id!==a.id);break;
 case "deleteAudit":{const r=w.audits.find(r=>r.id===a.id);if(!r)break;if(r.status==="approved")throw new Error("Согласованную ревизию нельзя удалить: остатки уже учтены");w.audits=w.audits.filter(r=>r.id!==a.id);notify(s,r.seller_id,"Ревизия отменена руководством. Заполнять её больше не требуется.","audit-delete:"+a.id);break;}
 case "requestAllAudits":{const sellers=s.team.filter(p=>p.role==="seller").sort((a,b)=>a.id.localeCompare(b.id));if(!sellers.length)throw new Error("В магазине пока нет продавцов");for(const [index,p] of sellers.entries()){const auditId=a.id.slice(0,24)+index.toString(16).padStart(12,"0");if(w.audits.some(r=>r.id===auditId))continue;w.audits.push({id:auditId,seller_id:p.id,note:a.note,created_at:now,status:"pending",photo:"",items:[]});notify(s,p.id,"Назначена общая ревизия. Пересчитайте товар, укажите брак и приложите чёткое фото всего товара. "+a.note,"audit:"+auditId);}break;}
 case "requestAudit":if(!s.team.some(p=>p.id===a.seller_id&&p.role==="seller"))throw new Error("Продавец не найден");if(!w.audits.some(r=>r.id===a.id)){w.audits.push({id:a.id,seller_id:a.seller_id,note:a.note,created_at:now,status:"pending",photo:"",items:[]});notify(s,a.seller_id,"Завершите ревизию: пересчитайте товар, укажите брак и приложите чёткое фото всего товара. "+a.note,"audit:"+a.id);}break;
 case "remindAudit":{const r=w.audits.find(r=>r.id===a.id);if(!r||r.status!=="pending")throw new Error("Нет ожидающей ревизии");notify(s,r.seller_id,"Напоминание: завершите ревизию. "+a.note,"reminder:"+r.id+":"+now);break;}
 case "returnAudit":{const r=w.audits.find(r=>r.id===a.id);if(!r||r.status!=="submitted")throw new Error("Можно вернуть только отправленную ревизию");r.status="pending";r.items=[];r.photo="";r.note+="\nПовторный пересчёт: "+a.note;notify(s,r.seller_id,"Ревизия возвращена на пересчёт. "+a.note,"audit-return:"+r.id+":"+now);break;}
 case "approveAudit":{const r=w.audits.find(r=>r.id===a.id);if(!r||r.status==="pending")throw new Error("Продавец ещё не заполнил ревизию");if(r.status==="approved")break;approveAuditStock(s,r);r.status="approved";r.approved_at=now;notify(s,r.seller_id,"Ревизия согласована. Остатки обновлены, брак исключён из доступного товара.","audit-approve:"+r.id);break;}

 case "rewardSettings":if(a.kind==="percent"&&a.value>100)throw new Error("Процент не больше 100");w.referral={kind:a.kind,value:a.value,limit:a.limit};s.settings.purchase_percent=a.purchase_percent;break;
 case "bonusRule":if(a.mode==="two_categories"&&(a.requirements.length!==2||a.requirements.some(r=>!r.category_id||r.product_id)||a.requirements[0].category_id===a.requirements[1].category_id))throw new Error("Выберите две разные категории");if(a.mode==="same_category"&&(a.requirements.length!==1||!a.requirements[0].category_id||a.requirements[0].product_id||a.requirements[0].quantity<2))throw new Error("Выберите категорию для двух разных товаров");if(a.reward==="discount"&&!a.mode)throw new Error("Выберите вариант акции");if(a.kind==="percent"&&a.value>100)throw new Error("Процент не больше 100");for(const r of a.requirements){if(r.category_id&&!s.categories.some(c=>c.id===r.category_id))throw new Error("Категория не найдена");if(r.product_id&&!s.products.some(p=>p.id===r.product_id&&(!r.category_id||[p.category_id,s.categories.find(c=>c.id===p.category_id)?.parent_id].includes(r.category_id))))throw new Error("Товар не входит в категорию");}w.bonusRules=w.bonusRules.filter(r=>r.id!==a.id).concat(a);break;
 case "deleteBonusRule":w.bonusRules=w.bonusRules.filter(r=>r.id!==a.id);break;
 case "manualBonus":{const key=a.target.replace(/^@/,"").toLowerCase(),p=s.team.find(p=>p.id===key||p.username.toLowerCase()===key);if(!p||p.role!=="buyer")throw new Error("Покупатель не найден");manualBonus(s,p.id,a.amount,a.reason,"manual:"+a.id);break;}
 case "notificationSettings":w.notifications=a.enabled;break;
 }
 return s;
}
