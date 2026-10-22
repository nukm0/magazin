import type {Snapshot} from "./types";
import type {BonusRule} from "./workspace-types";
type Line={productId:string;quantity:number;price?:number};
function within(s:Snapshot,productId:string,category:string){if(!category)return true;let id=s.products.find(p=>p.id===productId)?.category_id;const seen=new Set<string>();while(id&&!seen.has(id)){if(id===category)return true;seen.add(id);id=s.categories.find(c=>c.id===id)?.parent_id}return false}
export function matchingPromotion(s:Snapshot,r:BonusRule,items:Line[]){
 const sets=r.requirements.map(q=>items.map((i,n)=>({i,n})).filter(({i})=>i.quantity>0&&(q.product_id?i.productId===q.product_id:within(s,i.productId,q.category_id))));
 if(!sets.every((set,n)=>set.reduce((v,{i})=>v+i.quantity,0)>=r.requirements[n].quantity))return [];
 if(r.mode==="same_category"&&new Set(sets[0]?.map(({i})=>i.productId)).size<2)return [];
 if(r.mode==="two_categories"&&!sets[0]?.some(a=>sets[1]?.some(b=>a.i.productId!==b.i.productId)))return [];
 return [...new Set(sets.flat().map(({n})=>n))];
}
/** Allocate integer kopecks without losing money to floating-point rounding. */
function reduceCosts(costs:number[],indices:number[],amount:number){const total=indices.reduce((v,i)=>v+costs[i],0);if(!total||!amount)return;amount=Math.min(amount,total);const parts=indices.map(i=>{const n=BigInt(amount)*BigInt(costs[i]);return {i,value:Number(n/BigInt(total)),rest:n%BigInt(total)}});let remaining=amount-parts.reduce((v,p)=>v+p.value,0);parts.sort((a,b)=>a.rest===b.rest?a.i-b.i:a.rest>b.rest?-1:1);for(const p of parts){if(remaining>0){p.value++;remaining--}costs[p.i]-=p.value}}
export function promotionQuote(s:Snapshot,items:Line[],spentBonus=0){
 const original=items.map(i=>(i.price??s.products.find(p=>p.id===i.productId)?.price??0)*i.quantity),subtotal=original.reduce((v,n)=>v+n,0),matches=(s.workspace?.bonusRules||[]).map(rule=>({rule,indices:matchingPromotion(s,rule,items)})).filter(m=>m.indices.length);
 let discount=0,discountName="",discountIndices:number[]=[];
 for(const {rule,indices} of matches.filter(m=>m.rule.reward==="discount")){const base=indices.reduce((v,i)=>v+original[i],0),value=Math.min(base,rule.kind==="percent"?Math.floor(base*rule.value/100):rule.value);if(value>discount){discount=value;discountName=rule.name;discountIndices=indices}}
 const costs=[...original];reduceCosts(costs,discountIndices,discount);reduceCosts(costs,costs.map((_,i)=>i),Math.max(0,spentBonus)*100);
 const rewards=matches.filter(m=>m.rule.reward!=="discount").map(({rule,indices})=>{const base=rule.mode?indices.reduce((v,i)=>v+costs[i],0):Math.max(0,subtotal-discount-spentBonus*100);return {id:rule.id,name:rule.name,amount:rule.kind==="fixed"?rule.value:Math.floor(base*rule.value/10000)}}).filter(r=>r.amount>0);
 return {discount,discountName,rewards};
}
