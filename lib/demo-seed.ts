import type {Snapshot} from "./types";
const id=(n:number)=>`d0000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
export function seedDemo(s:Snapshot):Snapshot{
 if(s.demoVersion===2)return s;
 if(!s.demoVersion){
 const main=id(1),seller="100000003";
 s.categories.push({id:main,name:"Одежда · демо",parent_id:null},...[[2,"Худи"],[3,"Брюки"],[4,"Футболки"]].map(([n,name])=>({id:id(Number(n)),name:String(name),parent_id:main})));
 const samples=[{n:10,title:"Худи оверсайз Cloud",price:499000,stock:18,cat:2,color:"#ad9dc9",shape:"hoodie"},{n:11,title:"Брюки прямые Graphite",price:399000,stock:24,cat:3,color:"#555c70",shape:"pants"},{n:12,title:"Футболка Basic Milk",price:199000,stock:35,cat:4,color:"#e6dfcf",shape:"tee"}];
 s.products.push(...samples.map(p=>({id:id(p.n),title:p.title,description:"Демонстрационный товар. Размеры S–XL. Используется для проверки магазина и складского учёта.",price:p.price,stock:p.stock,category_id:id(p.cat),image_url:`/demo-clothes/${p.shape}.svg`,active:true,seller_id:seller,sku:`MW-${p.n}01`}))); 
 s.inventoryReviews??=[];s.dailyVisits=[];
 for(let i=44;i>=0;i--){const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()-i);const date=d.toISOString().slice(0,10);s.dailyVisits.push({date,visitors:32+(i*13)%97});for(let j=0;j<1+i%3;j++){const p=s.products.find(p=>p.id===id(10+(i+j)%3))!,quantity=1+(i+j)%2;s.orders.push({id:id(100+i*3+j),total:p.price*quantity,status:i%11===0?"cancelled":i%4===0?"shipped":"completed",created_at:d.toISOString(),user_id:"100000001",items:[{productId:p.id,title:p.title,price:p.price,quantity}],contact:"Демо-покупатель",address:"Демонстрационный заказ"});}}
 s.stats={visitors:s.dailyVisits.reduce((a,d)=>a+d.visitors,0),orders:s.orders.length,paid:s.orders.filter(o=>["paid","shipped","completed"].includes(o.status)).length,revenue:s.orders.filter(o=>["paid","shipped","completed"].includes(o.status)).reduce((a,o)=>a+o.total,0)};
 }
 s.sellerStocks=s.products.filter(p=>p.id.startsWith("d0000000")&&p.seller_id).flatMap(p=>[{seller_id:"100000003",productId:p.id,quantity:Math.ceil(p.stock/2)},{seller_id:"100000004",productId:p.id,quantity:Math.floor(p.stock/2)}]);
 s.orderEvents??=[];s.sellerEarnings??=[];
 for(const [i,o] of s.orders.filter(o=>o.id.startsWith("d0000000")).entries()){o.delivery_fee=35000;o.total+=35000;o.show_delivery=true;o.seller_id=i%2?"100000003":"100000004";if(o.status==="completed"){s.sellerEarnings.push({order_id:o.id,seller_id:o.seller_id,amount:35000,created_at:o.created_at});}}
 for(const p of s.team.filter(p=>p.role==="seller"))p.seller_balance=s.sellerEarnings.filter(e=>e.seller_id===p.id).reduce((n,e)=>n+e.amount,0);if(s.me?.role==="seller")s.me.seller_balance=s.team.find(p=>p.id===s.me!.id)?.seller_balance||0;
 for(const p of s.products.filter(p=>p.id.startsWith("d0000000"))){p.delivery_price=35000;p.show_delivery=true;}
 const demoProduct=s.products.find(p=>p.id===id(10))!;
 s.orders.push({id:id(999),user_id:"100000001",created_at:new Date().toISOString(),status:"open",seller_id:null,delivery_fee:35000,show_delivery:true,total:demoProduct.price+35000,items:[{productId:demoProduct.id,title:demoProduct.title,price:demoProduct.price,quantity:1}],contact:"Демо-покупатель · контакт заполнится при создании заказа",address:"Петрозаводск · демонстрационный район"});
 s.demoVersion=2;return s;
}
