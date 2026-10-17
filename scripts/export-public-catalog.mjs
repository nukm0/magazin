import {DatabaseSync} from "node:sqlite";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
const source=process.env.LOCAL_STORE_PATH||process.argv[2];
if(!source)throw new Error("Укажите путь к локальной базе первым аргументом");
const db=new DatabaseSync(source,{readOnly:true});
let state;
try{state=JSON.parse(db.prepare("SELECT data FROM local_shop WHERE id=1").get().data);}finally{db.close();}
const media={};
await mkdir("public/catalog-media",{recursive:true});await mkdir("data",{recursive:true});
for(const [id,value] of Object.entries(state.media)){
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
 if(!match||!/^[0-9a-f-]{36}$/.test(id))continue;
 const name=id+"."+(match[1]==="jpeg"?"jpg":match[1]);
 await writeFile(resolve("public/catalog-media",name),Buffer.from(match[2],"base64"));media[id]=name;
}
const catalog={settings:state.settings,categories:state.categories,products:state.products.filter(p=>p.active),media};
await writeFile("data/catalog.json",JSON.stringify(catalog,null,2)+"\n");
console.log(JSON.stringify({store:catalog.settings.name,products:catalog.products.length,categories:catalog.categories.length,images:Object.keys(media).length}));
