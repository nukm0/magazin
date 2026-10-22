import {z} from "zod";
import type {Snapshot} from "./types";
import {notify} from "./workspace";
const schema=z.object({action:z.enum(["cancelOrder","deleteOrder"]),id:z.string().uuid()});
export function changeOrder(s:Snapshot,input:unknown):Snapshot{
 const a=schema.parse(input),me=s.me!,o=s.orders.find(o=>o.id===a.id);if(!o)throw new Error("Заказ не найден");
 if(a.action==="deleteOrder"?me.role!=="owner":me.role!=="buyer"||o.user_id!==me.id)throw new Error("Нет доступа к заказу");
 if(a.action==="deleteOrder"&&o.deleted_at)return s;
 if(a.action==="cancelOrder"&&o.status==="cancelled")return s;
 if(o.status==="delivering")throw new Error("Заказ уже в доставке. Свяжитесь с продавцом для согласования возврата.");
 if(a.action==="cancelOrder"&&!["open","claimed","pending","awaiting_payment_setup"].includes(o.status))throw new Error("Этот заказ уже нельзя отменить");
 const now=new Date().toISOString();
 if(["open","claimed","pending","awaiting_payment_setup"].includes(o.status)){
  o.status="cancelled";
  if(o.bonus_spent&&!o.bonus_refunded){const buyer=s.team.find(p=>p.id===o.user_id);if(buyer){buyer.balance+=o.bonus_spent;if(s.me?.id===buyer.id)s.me={...buyer};s.workspace!.bonuses.push({id:crypto.randomUUID(),user_id:buyer.id,amount:o.bonus_spent,reason:"Возврат бонусов за отменённый заказ",source:"cancel-refund:"+o.id,created_at:now});o.bonus_refunded=true;}}
 }
 if(a.action==="deleteOrder")o.deleted_at=now;
 const text="Заказ #"+o.id.slice(-8)+(a.action==="deleteOrder"?" удалён владельцем из списка заказов.":" отменён покупателем.");
 for(const id of new Set([o.user_id,o.seller_id,...s.team.filter(p=>["owner","deputy"].includes(p.role)).map(p=>p.id)])){if(!id)continue;const source="order-"+a.action+":"+o.id;notify(s,id,text,source);const n=s.workspace!.notices.find(n=>n.user_id===id&&n.source===source);if(n)n.entity={type:"order",id:o.id};}
 (s.workspace!.activity??=[]).push({id:crypto.randomUUID(),actor_id:me.id,action:a.action,text,entity:{type:"order",id:o.id},created_at:now});
 return s;
}
