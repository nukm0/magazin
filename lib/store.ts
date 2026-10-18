import {validateAttributes,validateMeasurements} from "./measurements";
import {publicCatalog} from "./catalog";
import type {PoolClient} from "pg";
import {database,transaction} from "./db";
import {validateInitData,roleFor} from "./auth";
import {actionSchema} from "./validation";
import {defaultSettings,type Snapshot,type Profile,type Product,type Settings} from "./types";
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
export async function actor(request:Request) {
 const raw=request.headers.get("authorization")?.replace(/^tma /,"") || "";
 if(!raw)return null;
 if(!process.env.TELEGRAM_BOT_TOKEN)throw new ApiError(503,"Бот ещё не подключён");
 let data;
 try{data=validateInitData(raw,process.env.TELEGRAM_BOT_TOKEN);}catch(e){throw new ApiError(401,e instanceof Error?e.message:"Ошибка входа");}
 const id=String(data.id);
 return transaction(async c=>{
  if(!/^[1-9]\d{0,15}$/.test(process.env.OWNER_TELEGRAM_ID||""))throw new ApiError(503,"Не задан ID первого владельца");
  await c.query("INSERT INTO ownership(id,owner_id) VALUES(1,$1) ON CONFLICT DO NOTHING",[process.env.OWNER_TELEGRAM_ID]);
  const owner=(await c.query("SELECT owner_id FROM ownership WHERE id=1")).rows[0].owner_id;
  const firstStart=(await c.query("SELECT referred_by FROM bot_starts WHERE user_id=$1",[id])).rows[0];
  const ref=firstStart?firstStart.referred_by:/^ref_([1-9]\d{0,15})$/.exec(data.start_param)?.[1];
  await c.query(`INSERT INTO profiles(id,first_name,last_name,username,photo_url,referred_by)
    VALUES($1,$2,$3,$4,$5,(SELECT id FROM profiles WHERE id=$6 AND id<>$1))
    ON CONFLICT(id) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,username=EXCLUDED.username,photo_url=EXCLUDED.photo_url,last_seen=now()`,
    [id,data.first_name,data.last_name||"",data.username||"",data.photo_url||"",ref||null]);
  const row=(await c.query("SELECT * FROM profiles WHERE id=$1",[id])).rows[0];
  return {...row,role:roleFor(id,row.role,owner)} as Profile;
 });
}
export async function snapshot(request:Request):Promise<Snapshot> {
 if(!process.env.DATABASE_URL)return {settings:publicCatalog.settings,categories:publicCatalog.categories,products:publicCatalog.products,me:null,orders:[],ledger:[],referrals:0,team:[],stats:{visitors:0,orders:0,paid:0,revenue:0},configured:false};
 const me=await actor(request), admin=!!me && me.role!=="buyer";
 const db=database();
 const [s,c,p,o,b,r,t,stats]=await Promise.all([
 db.query("SELECT data FROM settings WHERE id=1"),
 db.query("SELECT * FROM categories ORDER BY name"),
 db.query("SELECT * FROM products WHERE active OR $1 ORDER BY created_at DESC",[admin]),
 me?db.query("SELECT * FROM orders WHERE user_id=$1 OR $2 ORDER BY created_at DESC LIMIT 100",[me.id,admin]):null,
 me?db.query("SELECT * FROM bonus_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",[me.id]):null,
 me?db.query("SELECT count(*)::int AS count FROM profiles WHERE referred_by=$1",[me.id]):null,
 admin?db.query("SELECT id,first_name,last_name,username,photo_url,CASE WHEN id=(SELECT owner_id FROM ownership WHERE id=1) THEN 'owner' ELSE role END AS role,theme,referred_by FROM profiles WHERE role='deputy' OR id=(SELECT owner_id FROM ownership WHERE id=1)",[]):null,
 admin?db.query(`SELECT (SELECT count(*)::int FROM profiles) AS visitors,count(*)::int AS orders,count(*) FILTER(WHERE status IN ('paid','shipped','completed'))::int AS paid,COALESCE(sum(total) FILTER(WHERE status IN ('paid','shipped','completed')),0)::float8 AS revenue FROM orders`):null
 ]);
 if(me)me.balance=Number((await db.query("SELECT COALESCE(sum(amount),0)::float8 AS balance FROM bonus_ledger WHERE user_id=$1",[me.id])).rows[0].balance);
 return {settings:s.rows[0]?.data||defaultSettings,categories:c.rows,products:p.rows,me,orders:o?.rows||[],ledger:b?.rows||[],referrals:r?.rows[0].count||0,team:t?.rows||[],stats:stats?.rows[0]||{visitors:0,orders:0,paid:0,revenue:0},configured:true};
}
async function savePicture(c:PoolClient,value:string){
 if(!value.startsWith("data:"))return value;
 const row=(await c.query("INSERT INTO media(data) VALUES($1) RETURNING id",[value])).rows[0];return "/api/media/"+row.id;
}
async function audit(c:PoolClient,id:string,action:string) {await c.query("INSERT INTO audit_log(actor_id,action) VALUES($1,$2)",[id,action]);}
export async function mutate(request:Request,input:unknown) {
 const a=actionSchema.parse(input),me=await actor(request);
 if(!me)throw new ApiError(401,"Откройте магазин через Telegram");
 return transaction(c=>applyMutation(c,me,a));
}
export async function applyMutation(c:PoolClient,me:Profile,a:ReturnType<typeof actionSchema.parse>){
  // Lock the current role for the duration of a mutation; revocation waits for this transaction.
  const owner=(await c.query("SELECT owner_id FROM ownership WHERE id=1 FOR UPDATE")).rows[0]?.owner_id;
  const row=(await c.query("SELECT role FROM profiles WHERE id=$1 FOR UPDATE",[me.id])).rows[0];
  const role=roleFor(me.id,row.role,owner);
  if(!["order","theme"].includes(a.action) && role==="buyer")throw new ApiError(403,"Нет доступа к управлению магазином");
  if(a.action==="image"){const image=(await c.query("INSERT INTO media(data) VALUES($1) RETURNING id",[a.data])).rows[0];return {ok:true,url:"/api/media/"+image.id};}
  if(a.action==="theme"){await c.query("UPDATE profiles SET theme=$1 WHERE id=$2",[a.theme,me.id]);return {ok:true};}
  if(a.action==="deputy"){
   if(a.id===owner)throw new ApiError(400,"Нельзя изменить права владельца");
   const result=await c.query("UPDATE profiles SET role=$1 WHERE id=$2",[a.enabled?"deputy":"buyer",a.id]);
   if(!result.rowCount)throw new ApiError(400,"Пользователь должен сначала открыть мини-приложение");
  }
  if(a.action==="transferOwner"){
   if(role!=="owner")throw new ApiError(403,"Передать магазин может только владелец");
   if(!(await c.query("SELECT 1 FROM profiles WHERE id=$1",[a.id])).rowCount)throw new ApiError(400,"Новый владелец должен сначала открыть магазин");
   await c.query("UPDATE ownership SET owner_id=$1 WHERE id=1",[a.id]);
   await c.query("UPDATE profiles SET role='buyer' WHERE id=ANY($1::text[])",[[me.id,a.id]]);
  }
  if(a.action==="settings")await c.query("UPDATE settings SET data=$1 WHERE id=1",[JSON.stringify({...a.value,banners:await Promise.all(a.value.banners.map(async b=>({...b,image_url:await savePicture(c,b.image_url)})))})]);
  if(a.action==="category"){
   if(a.parent_id){
    const parent=(await c.query("SELECT * FROM categories WHERE id=$1 FOR UPDATE",[a.parent_id])).rows[0];
    if(!parent || parent.parent_id || a.id===a.parent_id)throw new ApiError(400,"Выберите главную категорию");
    if(a.id && (await c.query("SELECT 1 FROM categories WHERE parent_id=$1 LIMIT 1",[a.id])).rowCount)throw new ApiError(400,"Сначала перенесите подкатегории");
   }
   if(a.id)await c.query("UPDATE categories SET name=$1,parent_id=$2,measurements=COALESCE($4::jsonb,measurements) WHERE id=$3",[a.name,a.parent_id,a.id,a.measurements?JSON.stringify(validateMeasurements(a.measurements)):null]);
   else await c.query("INSERT INTO categories(name,parent_id,measurements) VALUES($1,$2,$3)",[a.name,a.parent_id,JSON.stringify(validateMeasurements(a.measurements??[]))]);
  }
  if(a.action==="deleteCategory")await c.query("DELETE FROM categories WHERE id=$1",[a.id]);
  if(a.action==="product"){
   const categories=(await c.query("SELECT * FROM categories")).rows;
   const attributes=validateAttributes(categories,a.category_id,a.attributes);
   const args=[a.title,a.description,a.price,a.stock,a.category_id,await savePicture(c,a.image_url),a.active];
   if(a.id)await c.query("UPDATE products SET title=$1,description=$2,price=$3,stock=$4,category_id=$5,image_url=$6,active=$7,attributes=$9 WHERE id=$8",[...args,a.id,JSON.stringify(attributes)]);
   else await c.query("INSERT INTO products(title,description,price,stock,category_id,image_url,active,attributes) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[...args,JSON.stringify(attributes)]);
  }
  if(a.action==="deleteProduct")await c.query("UPDATE products SET active=false WHERE id=$1",[a.id]);
  if(a.action==="order"){
   const existing=(await c.query("SELECT id FROM orders WHERE user_id=$1 AND idempotency_key=$2",[me.id,a.idempotency_key])).rows[0];
   if(existing)return {ok:true,orderId:existing.id};
   if(new Set(a.items.map(i=>i.productId)).size!==a.items.length)throw new ApiError(400,"Товары в корзине повторяются");
   const products=(await c.query("SELECT * FROM products WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",[a.items.map(i=>i.productId)])).rows as Product[];
   const items=a.items.map(i=>{
    const p=products.find(p=>p.id===i.productId);
    if(!p || !p.active || p.stock<i.quantity)throw new ApiError(409,"Товар недоступен или изменилось количество");
    return {...i,title:p.title,price:p.price};
   });
   const total=items.reduce((s,i)=>s+i.price*i.quantity,0);
   if(!Number.isSafeInteger(total)||total>100000000)throw new ApiError(400,"Сумма заказа слишком большая");
   if((await c.query("SELECT 1 FROM orders WHERE user_id=$1 AND created_at>now()-interval '1 minute' LIMIT 1",[me.id])).rowCount)throw new ApiError(429,"Подождите минуту перед следующим заказом");
   const order=(await c.query("INSERT INTO orders(user_id,items,total,contact,address,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[me.id,JSON.stringify(items),total,a.contact,a.address,a.idempotency_key])).rows[0];
   return {ok:true,orderId:order.id};
  }
  if(a.action==="orderStatus"){
   const order=(await c.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE",[a.id])).rows[0];
   const allowed:Record<string,string[]>={awaiting_payment_setup:["cancelled"],pending:["cancelled"],paid:["shipped"],shipped:["completed"]};
   if(!order || !allowed[order.status]?.includes(a.status))throw new ApiError(400,"Этот переход статуса недоступен");
   await c.query("UPDATE orders SET status=$1 WHERE id=$2",[a.status,a.id]);
  }
  await audit(c,me.id,a.action);
  return {ok:true};
}
