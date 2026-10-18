import {initWorkspace,payout,notify,rewardOrder} from "./workspace";
import {telegramContact} from "./validation";
import {cartQuote} from "./pricing";
import {z} from "zod";
import type {Snapshot} from "./types";
const uuid=z.string().uuid(),quantity=z.number().int().min(0).max(1000000);
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("claimOrder"),id:uuid}),
 z.object({action:z.literal("acceptOrder"),id:uuid}),
 z.object({action:z.literal("deliverOrder"),id:uuid}),
 z.object({action:z.literal("returnOrder"),id:uuid,reason:z.string().trim().min(3).max(1000)}),
 z.object({action:z.literal("demoOrder"),spend_bonus:z.number().int().nonnegative().optional(),id:uuid,items:z.array(z.object({productId:uuid,quantity:quantity.min(1).max(99),variant:z.string().max(80).optional()})).min(1).max(50),contact:telegramContact,address:z.string().trim().min(1).max(1000),comment:z.string().trim().max(1000).optional()}),
 z.object({action:z.literal("stockReceipt"),id:uuid,productId:uuid,quantity:quantity.min(1),note:z.string().trim().min(1).max(500)}),
 z.object({action:z.literal("inventoryReview"),id:uuid,note:z.string().trim().min(1).max(500),items:z.array(z.object({productId:uuid,expected:quantity,actual:quantity})).min(1).max(500)})
]);
export function sellerMutation(state:Snapshot,input:unknown):Snapshot{
 const a=schema.parse(input),s=initWorkspace(structuredClone(state)),me=s.me;
 if(!me)throw new Error("Выберите аккаунт");
 const created_at=new Date().toISOString();s.inventoryReviews??=[];s.orderEvents??=[];s.sellerEarnings??=[];s.sellerStocks??=[];
 if(a.action==="demoOrder"){
 if(me.role!=="buyer")throw new Error("Заказ создаёт только покупатель");if(s.orders.some(o=>o.id===a.id))return s;
 if(new Set(a.items.map(i=>i.productId)).size!==a.items.length)throw new Error("Повтор товара");
 const items=a.items.map(i=>{const p=s.products.find(p=>p.id===i.productId&&p.active);if(!p||p.stock<i.quantity)throw new Error("Недостаточно товара");if(p.variants?.length&&(!i.variant||!p.variants.includes(i.variant)))throw new Error("Выберите вариант товара");return {...i,title:p.title,price:p.price};});
 const spend=a.spend_bonus||0;const subtotal=items.reduce((n,i)=>n+i.price*i.quantity,0);if(spend>me.balance||spend*100>subtotal)throw new Error("Недостаточно бонусов или превышена стоимость товаров");if(spend){me.balance-=spend;s.team=s.team.map(p=>p.id===me.id?structuredClone(me):p);s.workspace!.bonuses.push({id:crypto.randomUUID(),user_id:me.id,amount:-spend,reason:"Списание бонусов при заказе",source:"spend:"+a.id,created_at});}
 const quote=cartQuote(items.map(i=>({product:s.products.find(p=>p.id===i.productId)!,quantity:i.quantity})));const delivery_fee=quote.delivery;
 s.orders.push({id:a.id,user_id:me.id,created_at,status:"open",bonus_spent:spend,seller_id:null,items,contact:a.contact,address:a.address,comment:a.comment||"",price_details:{goods:quote.goods,delivery:quote.shownDelivery,show_delivery:quote.showDelivery},delivery_fee,show_delivery:items.some(i=>s.products.find(p=>p.id===i.productId)?.show_delivery),total:subtotal+delivery_fee-spend*100});notify(s,me.id,"Заказ #"+a.id.slice(-8)+" создан. Ожидайте ответа продавца.","new-buyer:"+a.id);for(const p of s.team.filter(p=>p.role==="seller"))notify(s,p.id,"Новый заказ #"+a.id.slice(-8)+" доступен в общей ленте.","new-seller:"+a.id);return s;
 }
 if(me.role!=="seller")throw new Error("Действие доступно только продавцу");
 const own=s.sellerStocks.filter(p=>p.seller_id===me.id);
 const get=(id:string)=>{const stock=own.find(p=>p.productId===id),product=s.products.find(p=>p.id===id);if(!stock||!product)throw new Error("Товар не числится на вашем складе");return {stock,product};};
 if(["claimOrder","returnOrder","acceptOrder","deliverOrder"].includes(a.action)){
 const o=s.orders.find(o=>o.id===a.id);if(!o)throw new Error("Заказ не найден");
 const event=(type:"claimed"|"returned"|"accepted"|"delivered",reason="")=>s.orderEvents!.push({id:crypto.randomUUID(),order_id:o.id,seller_id:me.id,type,reason,created_at});
 if(a.action==="claimOrder"){if(o.status!=="open"||o.seller_id)throw new Error("Заказ уже взял другой продавец");o.status="claimed";o.seller_id=me.id;o.claimed_at=created_at;event("claimed");notify(s,o.user_id,"Ваш заказ взял продавец @"+me.username+". Он свяжется с вами.","claimed:"+o.id+":"+created_at);}
 else{
 if(o.seller_id!==me.id)throw new Error("Заказ закреплён за другим продавцом");
 if(a.action==="returnOrder"){if(o.status!=="claimed")throw new Error("Вернуть можно заказ до принятия в доставку");o.status="open";o.seller_id=null;event("returned",a.reason);notify(s,o.user_id,"Заказ возвращён в общую очередь. Ищем другого продавца.","returned-buyer:"+o.id+":"+created_at);for(const p of s.team.filter(p=>["owner","deputy"].includes(p.role)))notify(s,p.id,"Продавец @"+me.username+" вернул заказ #"+o.id.slice(-8)+". Причина: "+a.reason,"returned-admin:"+o.id+":"+created_at);}
 else if(a.action==="acceptOrder"){
 if(o.status!=="claimed")throw new Error("Сначала возьмите заказ и свяжитесь с покупателем");
 for(const i of o.items){const {stock,product}=get(i.productId);if(stock.quantity<i.quantity||product.stock<i.quantity)throw new Error("На вашем складе недостаточно товара. Пополните склад или верните заказ с причиной");}
 for(const i of o.items){const {stock,product}=get(i.productId);stock.quantity-=i.quantity;product.stock-=i.quantity;}
 o.payout_quote=payout(s,o,me.id);o.status="delivering";event("accepted");notify(s,o.user_id,"Ваш заказ принят в доставку. Продавец: @"+me.username,"accepted:"+o.id);
 }else{
 if(o.status==="completed"&&s.sellerEarnings.some(e=>e.order_id===o.id))return s;
 if(o.status!=="delivering")throw new Error("Сначала примите заказ в доставку");
 o.status="completed";o.delivered_at=created_at;
 if(!s.sellerEarnings.some(e=>e.order_id===o.id)){const quote=o.payout_quote||payout(s,o,me.id);const amount=quote.amount;s.sellerEarnings.push({order_id:o.id,seller_id:me.id,amount,created_at});me.seller_balance=(me.seller_balance||0)+amount;s.team=s.team.map(p=>p.id===me.id?structuredClone(me):p);}
 event("delivered");notify(s,me.id,"Вы получили за заказ #"+o.id.slice(-8)+":\n"+(o.payout_quote?.text||payout(s,o,me.id).text)+"\nИтого +"+((o.payout_quote?.amount??o.delivery_fee??0)/100)+" ₽","delivered-seller:"+o.id);notify(s,o.user_id,"Ваш заказ доставлен и закрыт. В течение 24 часов можно подать жалобу в истории заказов личного кабинета.","delivered-buyer:"+o.id);rewardOrder(s,o);for(const p of s.team.filter(p=>["owner","deputy"].includes(p.role)))notify(s,p.id,"Заказ #"+o.id.slice(-8)+" выполнен. Продавец: @"+me.username+". Начислено: "+((o.payout_quote?.amount??o.delivery_fee??0)/100)+" ₽.","delivered-admin:"+o.id);
 }
 }
 return s;
 }
 if(a.action==="stockReceipt"){
 if(s.inventoryReviews.some(r=>r.id===a.id))return s;
 const {stock,product}=get(a.productId);if(stock.quantity+a.quantity>1000000||product.stock+a.quantity>1000000)throw new Error("Превышен максимальный остаток");
 s.inventoryReviews.push({id:a.id,created_at,seller_id:me.id,note:"Поступление: "+a.note,items:[{productId:product.id,title:product.title,expected:stock.quantity,actual:stock.quantity+a.quantity,difference:a.quantity}]});stock.quantity+=a.quantity;product.stock+=a.quantity;
 }else if(a.action==="inventoryReview"){
 if(s.inventoryReviews.some(r=>r.id===a.id))return s;
 if(new Set(a.items.map(i=>i.productId)).size!==a.items.length||a.items.length!==own.length)throw new Error("Пересчитайте все свои товары без повторов");
 const items=a.items.map(i=>{const {stock,product}=get(i.productId);if(stock.quantity!==i.expected)throw new Error("Остатки изменились. Начните ревизию заново");return {...i,title:product.title,difference:i.actual-i.expected};});
 for(const i of items){const {stock,product}=get(i.productId);stock.quantity=i.actual;product.stock+=i.difference;}
 s.inventoryReviews.push({id:a.id,created_at,seller_id:me.id,note:a.note,items});
 }
 return s;
}
