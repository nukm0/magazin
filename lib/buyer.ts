import type {Order} from "./types";
export const complaintReasons=["Некомпетентность продавца","Бракованный товар","Не тот товар или неполный заказ","Проблема с доставкой","Заказ не получен","Другое"] as const;
export function activeBuyerOrder(order:Order){return ["open","claimed","delivering"].includes(order.status);}
export function complaintDeadline(order:Order){return order.status==="completed"&&order.delivered_at?Date.parse(order.delivered_at)+86400000:0;}
export function canComplain(order:Order,now=Date.now()){const end=complaintDeadline(order);return Number.isFinite(end)&&end>0&&now>=end-86400000&&now<end;}
