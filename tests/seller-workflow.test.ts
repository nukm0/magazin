import {test} from "node:test";
import assert from "node:assert/strict";
import {catalogPreview,prepareDemo,switchPreviewProfile,previewMutation} from "../lib/demo";
const setup=()=>prepareDemo(catalogPreview());
const open=(s:ReturnType<typeof setup>)=>s.orders.find(o=>o.status==="open")!;
test("Claim, return with reason, reassign, deliver and credit exactly once",()=>{
 let s=setup();const orderId=open(s).id;
 s=switchPreviewProfile(s,"100000003");s=previewMutation(s,{action:"claimOrder",id:orderId});
 s=switchPreviewProfile(s,"100000004");assert.throws(()=>previewMutation(s,{action:"claimOrder",id:orderId}),/другой/);
 assert.throws(()=>previewMutation(s,{action:"returnOrder",id:orderId,reason:"Не мой район"}),/другим/);
 s=switchPreviewProfile(s,"100000003");assert.throws(()=>previewMutation(s,{action:"returnOrder",id:orderId,reason:" "}));
 s=previewMutation(s,{action:"returnOrder",id:orderId,reason:"Не подошёл район"});assert.equal(open(s).id,orderId);assert.equal(s.orderEvents?.at(-1)?.reason,"Не подошёл район");
 s=switchPreviewProfile(s,"100000004");s=previewMutation(s,{action:"claimOrder",id:orderId});
 assert.throws(()=>previewMutation(s,{action:"deliverOrder",id:orderId}),/Сначала/);
 const p=s.orders.find(o=>o.id===orderId)!.items[0],stock=s.sellerStocks!.find(x=>x.seller_id===s.me!.id&&x.productId===p.productId)!.quantity;
 s=previewMutation(s,{action:"acceptOrder",id:orderId});assert.equal(s.sellerStocks!.find(x=>x.seller_id===s.me!.id&&x.productId===p.productId)!.quantity,stock-p.quantity);
 assert.throws(()=>previewMutation(s,{action:"returnOrder",id:orderId,reason:"Отмена"}));
 const before=s.me!.seller_balance||0;s=previewMutation(s,{action:"deliverOrder",id:orderId});assert.equal(s.me!.seller_balance,before+35000);
 s=previewMutation(s,{action:"deliverOrder",id:orderId});assert.equal(s.me!.seller_balance,before+35000);assert.equal(s.sellerEarnings!.filter(e=>e.order_id===orderId).length,1);
});
test("Buyer checkout calculates prices and delivery, sellers cannot edit listings",()=>{
 let s=setup();s=switchPreviewProfile(s,"100000003");assert.throws(()=>previewMutation(s,{action:"deleteProduct",id:s.products[0].id}));
 const p=s.products.find(p=>p.delivery_price)!;s=switchPreviewProfile(s,"100000001");const id=crypto.randomUUID();const action={action:"demoOrder",id,items:[{productId:p.id,quantity:2}],contact:"@testbuyer",address:"Центр"};
 s=previewMutation(s,action);assert.equal(s.orders.at(-1)?.total,p.price*2+35000);assert.equal(s.orders.at(-1)?.status,"open");s=previewMutation(s,action);assert.equal(s.orders.filter(o=>o.id===id).length,1);
 assert.throws(()=>previewMutation(s,{action:"claimOrder",id}));
});
test("Inventory review is complete, atomic, stale guarded and recorded",()=>{
 let s=switchPreviewProfile(setup(),"100000003");const own=s.sellerStocks!.filter(p=>p.seller_id===s.me!.id),id=crypto.randomUUID();
 const items=own.map(p=>({productId:p.productId,expected:p.quantity,actual:Math.max(0,p.quantity-1)}));
 assert.throws(()=>previewMutation(s,{action:"inventoryReview",id,note:"Пересчёт",items:items.slice(1)}));
 assert.throws(()=>previewMutation(s,{action:"inventoryReview",id,note:"Пересчёт",items:items.map((p,i)=>i? p:{...p,expected:p.expected+1})}));
 const original=s.products.find(p=>p.id===items[0].productId)!.stock;
 s=previewMutation(s,{action:"inventoryReview",id,note:"Пересчёт",items});assert.equal(s.inventoryReviews?.at(-1)?.items[0].difference,-1);assert.equal(s.products.find(p=>p.id===items[0].productId)!.stock,original-1);
 const again=previewMutation(s,{action:"inventoryReview",id,note:"Пересчёт",items});assert.equal(again.inventoryReviews!.length,s.inventoryReviews!.length);
});
test("Insufficient seller stock does not reserve any lines or change status",()=>{
 let s=setup();const id=open(s).id;s=switchPreviewProfile(s,"100000003");s=previewMutation(s,{action:"claimOrder",id});
 const pid=s.orders.find(o=>o.id===id)!.items[0].productId;s.sellerStocks!.find(p=>p.seller_id===s.me!.id&&p.productId===pid)!.quantity=0;
 const before=JSON.stringify(s);assert.throws(()=>previewMutation(s,{action:"acceptOrder",id}),/недостаточно/);assert.equal(JSON.stringify(s),before);
});
test("Demo seeding keeps user content and never duplicates sample history",()=>{
 const s=setup(),next=prepareDemo(structuredClone(s));assert.equal(next.products.length,s.products.length);assert.equal(next.orders.length,s.orders.length);assert.equal(next.dailyVisits?.length,45);assert.equal(next.products[0].title,s.products[0].title);
});
