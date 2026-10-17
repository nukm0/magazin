import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {unlinkSync} from "node:fs";
import {resolve} from "node:path";
import {LocalStore} from "../lib/local-store";
import {isLocalRequest,assertLocalOrigin} from "../lib/local-mode";

const owner="998579758",buyer="100000001",deputy="100000002";
function product(db:LocalStore,stock=5){
 db.snapshot(owner);
 db.mutate(owner,{action:"product",title:"Проверочный товар",description:"",price:100000,stock,category_id:null,image_url:"",active:true});
 return db.snapshot(owner).products[0].id;
}
function order(db:LocalStore,id:string,productId:string,bonus=0,key=randomUUID()){
 db.mutate(id,{action:"order",items:[{productId,quantity:1}],contact:"Тестовый контакт",address:"Самовывоз",idempotency_key:key,spend_bonus:bonus});
 return db.snapshot(id).orders[0];
}
test("Local login is nukm0 owner; SQLite data survives reopening",()=>{
 const path=resolve(".local","tests","persist-"+randomUUID()+".sqlite");
 let db=new LocalStore(path);
 try{const s=db.snapshot(owner);assert.equal(s.me?.username,"nukm0");assert.equal(s.me?.role,"owner");assert.equal(s.local,true);product(db);db.close();db=new LocalStore(path);assert.equal(db.snapshot(owner).products.length,1);}
 finally{db.close();unlinkSync(path);}
});
test("Local payment updates stock, bonuses and statistics exactly once; bonus spending works",()=>{
 const db=new LocalStore(":memory:");
 try{
 const p=product(db);db.mutate(owner,{action:"settings",value:{...db.snapshot(owner).settings,purchase_percent:10,referral_reward:50}});
 db.snapshot(buyer,owner);
 const a=order(db,buyer,p);
 db.mutate(buyer,{action:"localPayment",id:a.id});db.mutate(buyer,{action:"localPayment",id:a.id});
 assert.equal(db.snapshot(owner).stats.revenue,100000);assert.equal(db.snapshot(owner).stats.paid,1);
 assert.equal(db.snapshot(owner).products[0].stock,4);assert.equal(db.snapshot(buyer).me?.balance,100);assert.equal(db.snapshot(owner).me?.balance,50);
 const b=order(db,buyer,p,50);assert.equal(b.total,95000);
 db.mutate(buyer,{action:"localPayment",id:b.id});
 assert.equal(db.snapshot(buyer).me?.balance,145);assert.equal(db.snapshot(owner).me?.balance,50);
 db.mutate(owner,{action:"localRefund",id:b.id});db.mutate(owner,{action:"localRefund",id:b.id});
 assert.equal(db.snapshot(buyer).me?.balance,100);assert.equal(db.snapshot(owner).products[0].stock,4);
 db.mutate(owner,{action:"localRefund",id:a.id});
 assert.equal(db.snapshot(owner).stats.revenue,0);assert.equal(db.snapshot(owner).products[0].stock,5);assert.equal(db.snapshot(owner).me?.balance,0);assert.equal(db.snapshot(buyer).me?.balance,0);
 }finally{db.close();}
});
test("Failed local payment rolls back when another order uses the last item",()=>{
 const db=new LocalStore(":memory:");
 try{const p=product(db,1);const a=order(db,owner,p),b=order(db,buyer,p);
 db.mutate(owner,{action:"localPayment",id:a.id});assert.throws(()=>db.mutate(buyer,{action:"localPayment",id:b.id}));
 assert.equal(db.snapshot(owner).products[0].stock,0);assert.equal(db.snapshot(buyer).orders[0].status,"pending");assert.equal(db.snapshot(owner).stats.paid,1);
 }finally{db.close();}
});
test("Deputy revocation and ownership transfer apply immediately in local mode",()=>{
 const db=new LocalStore(":memory:");
 try{db.snapshot(owner);db.snapshot(deputy);db.snapshot(buyer);
 db.mutate(owner,{action:"deputy",id:deputy,enabled:true});assert.equal(db.snapshot(deputy).me?.role,"deputy");
 assert.throws(()=>db.mutate(deputy,{action:"transferOwner",id:buyer}));
 db.mutate(owner,{action:"deputy",id:deputy,enabled:false});assert.throws(()=>db.mutate(deputy,{action:"category",name:"Нет доступа",parent_id:null}));
 db.mutate(owner,{action:"transferOwner",id:buyer});assert.equal(db.snapshot(owner).me?.role,"buyer");assert.equal(db.snapshot(buyer).me?.role,"owner");
 assert.throws(()=>db.mutate(owner,{action:"category",name:"Нет доступа",parent_id:null}));
 }finally{db.close();}
});
test("Local checkout is idempotent and rejects duplicate products and unsupported accounts",()=>{
 const db=new LocalStore(":memory:");
 try{const p=product(db),key=randomUUID();order(db,owner,p,0,key);order(db,owner,p,0,key);assert.equal(db.snapshot(owner).orders.length,1);
 assert.throws(()=>db.snapshot("555"));
 assert.throws(()=>db.mutate(owner,{action:"order",items:[{productId:p,quantity:1},{productId:p,quantity:1}],contact:"Тест",address:"Тест",idempotency_key:randomUUID()}));
 }finally{db.close();}
});
test("Local bypass requires development, loopback, matching host and no Vercel",()=>{
 const before={NODE_ENV:process.env.NODE_ENV,LOCAL_DEV_MODE:process.env.LOCAL_DEV_MODE,VERCEL:process.env.VERCEL};
 try{
 Object.assign(process.env,{NODE_ENV:"development",LOCAL_DEV_MODE:"1"});delete process.env.VERCEL;
 assert.equal(isLocalRequest(new Request("http://127.0.0.1:3000")),true);
 assert.equal(isLocalRequest(new Request("https://magazin-orcin-kappa.vercel.app")),false);
 assert.equal(isLocalRequest(new Request("http://127.0.0.1:3000",{headers:{host:"attacker.example"}})),false);
 process.env.VERCEL="1";assert.equal(isLocalRequest(new Request("http://127.0.0.1:3000")),false);delete process.env.VERCEL;
 Object.assign(process.env,{NODE_ENV:"production"});assert.equal(isLocalRequest(new Request("http://127.0.0.1:3000")),false);
 assert.throws(()=>assertLocalOrigin(new Request("http://127.0.0.1:3000",{headers:{origin:"https://attacker.example"}})));
 }finally{for(const [k,v] of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
