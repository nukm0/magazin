import {database} from "@/lib/db";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/.test(id))return new Response(null,{status:404});
 try{const row=(await database().query("SELECT data FROM media WHERE id=$1",[id])).rows[0];
 if(!row)return new Response(null,{status:404});
 const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(row.data);
 if(!match)return new Response(null,{status:404});
 return new Response(Buffer.from(match[2],"base64"),{headers:{"Content-Type":match[1],"Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff"}});
 }catch{return new Response(null,{status:503});}
}
