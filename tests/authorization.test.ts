import {test} from "node:test";import assert from "node:assert/strict";import type {PoolClient} from "pg";import {applyMutation,ApiError} from "../lib/store";import {actionSchema} from "../lib/validation";import {roleFor} from "../lib/auth";import {blankPreview} from "../lib/demo";

test("Revoked deputy cannot mutate even with a stale admin profile",async()=>{
 const old=process.env.OWNER_TELEGRAM_ID;process.env.OWNER_TELEGRAM_ID="998579758";
 try{const me={...blankPreview().me!,id:"123",role:"deputy" as const};const client={query:async()=>({rows:[{role:"buyer"}]})} as unknown as PoolClient;
 await assert.rejects(()=>applyMutation(client,me,actionSchema.parse({action:"deleteProduct",id:crypto.randomUUID()})),(e:unknown)=>e instanceof ApiError&&e.status===403);
 }finally{if(old===undefined)delete process.env.OWNER_TELEGRAM_ID;else process.env.OWNER_TELEGRAM_ID=old;}
});
test("Deputy can manage deputies but cannot alter the owner",async()=>{
 const me={...blankPreview().me!,id:"123",role:"deputy" as const};let updates=0;
 const client={query:async(sql:string)=>{if(sql.startsWith("SELECT owner_id"))return {rows:[{owner_id:"998579758"}]};if(sql.startsWith("SELECT role"))return {rows:[{role:"deputy"}]};if(sql.startsWith("UPDATE profiles"))updates++;return {rows:[],rowCount:1};}} as unknown as PoolClient;
 await applyMutation(client,me,actionSchema.parse({action:"deputy",id:"456",enabled:true}));assert.equal(updates,1);
 await assert.rejects(()=>applyMutation(client,me,actionSchema.parse({action:"deputy",id:"998579758",enabled:false})),(e:unknown)=>e instanceof ApiError&&e.status===400);
 await assert.rejects(()=>applyMutation(client,me,actionSchema.parse({action:"transferOwner",id:"456"})));assert.equal(updates,1);
});

test("Order total and line prices come from catalog, never the submitted cart",async()=>{
 const me={...blankPreview().me!,id:"123",role:"buyer" as const},productId=crypto.randomUUID();let stored:unknown[]=[];
 const client={query:async(sql:string,args:unknown[])=>{
 if(sql.startsWith("SELECT role"))return {rows:[{role:"buyer"}]};
 if(sql.startsWith("SELECT * FROM products"))return {rows:[{id:productId,title:"Каталог",price:12549,stock:3,active:true}]};
 if(sql.startsWith("INSERT INTO orders")){stored=args;return {rows:[{id:"new-order"}]};}
 return {rows:[],rowCount:0};
 }} as unknown as PoolClient;
 const action=actionSchema.parse({action:"order",idempotency_key:crypto.randomUUID(),items:[{productId,quantity:2,price:1}],total:1,contact:"@testbuyer",address:"Самовывоз"});
 await applyMutation(client,me,action);assert.equal(stored[2],25098);assert.equal(JSON.parse(stored[1] as string)[0].price,12549);
});
test("Repeated checkout key returns the existing order without another insert",async()=>{
 const me={...blankPreview().me!,id:"123",role:"buyer" as const};let inserts=0;
 const client={query:async(sql:string)=>{if(sql.startsWith("SELECT role"))return {rows:[{role:"buyer"}]};if(sql.startsWith("SELECT id FROM orders"))return {rows:[{id:"existing-order"}]};if(sql.startsWith("INSERT"))inserts++;return {rows:[]};}} as unknown as PoolClient;
 const result=await applyMutation(client,me,actionSchema.parse({action:"order",idempotency_key:crypto.randomUUID(),items:[{productId:crypto.randomUUID(),quantity:1}],contact:"@testbuyer",address:"Самовывоз"}));
 assert.equal((result as {orderId:string}).orderId,"existing-order");assert.equal(inserts,0);
});

test("A transferred owner is resolved from the current database owner, not bootstrap ID",()=>{assert.equal(roleFor("998579758","buyer","555"),"buyer");assert.equal(roleFor("555","buyer","555"),"owner");});
