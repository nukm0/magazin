import pg from "pg";
import {readFile} from "node:fs/promises";
if(!process.env.DATABASE_URL)throw new Error("Укажите DATABASE_URL в .env.local");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{
 await pool.query(await readFile(new URL("../db/001_initial.sql",import.meta.url),"utf8"));
 const catalog=JSON.parse(await readFile(new URL("../data/catalog.json",import.meta.url),"utf8"));
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  await client.query("LOCK TABLE products,categories,orders IN EXCLUSIVE MODE");
  const counts=(await client.query("SELECT (SELECT count(*) FROM products)+(SELECT count(*) FROM categories)+(SELECT count(*) FROM orders) AS count")).rows[0];
  const current=(await client.query("SELECT data FROM settings WHERE id=1 FOR UPDATE")).rows[0]?.data;
  if(Number(counts.count)===0 && current?.name==="Мой магазин"){
   await client.query("UPDATE settings SET data=$1 WHERE id=1",[JSON.stringify(catalog.settings)]);
   const categories=[...catalog.categories].sort((a,b)=>Number(!!a.parent_id)-Number(!!b.parent_id));
   for(const c of categories)await client.query("INSERT INTO categories(id,name,parent_id) VALUES($1,$2,$3)",[c.id,c.name,c.parent_id]);
   for(const p of catalog.products)await client.query("INSERT INTO products(id,title,description,price,stock,category_id,image_url,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[p.id,p.title,p.description,p.price,p.stock,p.category_id,p.image_url,p.active]);
   console.log("Каталог и оформление перенесены в новую базу.");
  }else console.log("Существующие данные магазина сохранены без изменений.");
  await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
 console.log("Схема базы данных готова");
}finally{await pool.end();}
