import type {Product} from "./types";
export function catalogPrice(p:Pick<Product,"price"|"delivery_price"|"show_delivery">){return p.price+(p.show_delivery?0:p.delivery_price||0);}
/** One delivery per order, at the highest applicable rate. Hidden fees stay in the goods amount. */
export function cartQuote(lines:{product:Pick<Product,"price"|"delivery_price"|"show_delivery">;quantity:number}[]){
 const subtotal=lines.reduce((n,l)=>n+l.product.price*l.quantity,0);
 const delivery=Math.max(0,...lines.map(l=>l.product.delivery_price||0));
 const hidden=Math.max(0,...lines.filter(l=>!l.product.show_delivery).map(l=>l.product.delivery_price||0));
 return {subtotal,delivery,total:subtotal+delivery,goods:subtotal+hidden,shownDelivery:delivery-hidden,showDelivery:lines.some(l=>l.product.show_delivery)&&(!hidden||delivery>hidden)};
}
