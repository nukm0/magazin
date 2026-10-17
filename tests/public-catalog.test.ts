import {test} from "node:test";
import assert from "node:assert/strict";
import {snapshot} from "../lib/store";
import {publicCatalog} from "../lib/catalog";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
test("Public storefront contains only published catalog, never a local owner session",async()=>{
 const old=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 try{const data=await snapshot(new Request("https://magazin-orcin-kappa.vercel.app/api/store",{headers:{"x-local-user":"998579758",authorization:"tma forged"}}));
 assert.equal(data.me,null);assert.equal(data.configured,false);assert.equal(data.local,undefined);assert.equal(data.orders.length,0);assert.equal(data.ledger.length,0);assert.equal(data.team.length,0);
 assert.equal(data.settings.name,publicCatalog.settings.name);assert.ok(data.products.every(p=>p.active));
 }finally{if(old===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=old;}
});
test("Exported photos exist and public snapshot excludes private records",()=>{
 assert.equal("profiles" in publicCatalog,false);assert.equal("orders" in publicCatalog,false);assert.equal("ledger" in publicCatalog,false);
 for(const [id,file] of Object.entries(publicCatalog.media)){assert.match(id,/^[0-9a-f-]{36}$/);assert.match(file,/^[0-9a-f-]{36}\.(png|jpg|webp)$/);assert.ok(readFileSync(resolve("public/catalog-media",file)).length>0);}
});
