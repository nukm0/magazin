import {noticeCategory} from "./bot-screens";
import {botAppUrl} from "./bot-config";
import type {PoolClient} from "pg";
import {database} from "./db";
import type {Notice} from "./workspace-types";
export const notificationsEnabled=()=>!!process.env.DATABASE_URL;
export async function enqueueNotice(c:Pick<PoolClient,"query">,userId:string,text:string,source:string,entity?:Notice["entity"]){
 if(!/^[1-9]\d{0,15}$/.test(userId))throw new Error("Invalid notification recipient");if(!text||text.length>4000||source.length>200)throw new Error("Invalid notification content");
 await c.query("INSERT INTO app_notifications(user_id,text,source,entity) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(user_id,source) DO NOTHING",[userId,text,source,entity?JSON.stringify(entity):null]);
 const owner=(await c.query("SELECT owner_id FROM ownership WHERE id=1")).rows[0]?.owner_id||process.env.OWNER_TELEGRAM_ID;
 if(owner&&owner!==userId&&/^[1-9]\d{0,15}$/.test(owner)){const profile=(await c.query("SELECT username,first_name FROM profiles WHERE id=$1",[userId])).rows[0],label=profile?.username?"@"+profile.username:userId,copy=noticeCategory(source)+" · копия владельцу\nПолучатель: "+label+"\n\n"+text.slice(0,3600),presentation=entity?{type:entity.type,id:entity.id,...(entity.type==="bot"?{photo:entity.photo}:{})}:undefined;await c.query("INSERT INTO app_notifications(user_id,text,source,entity) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(user_id,source) DO NOTHING",[owner,copy,"owner-copy:"+userId+":"+source,presentation?JSON.stringify(presentation):null]);}
}
export async function sendTelegramNotice(n:{user_id:string;text:string;source?:string;entity?:Notice["entity"]},transport:typeof fetch=fetch){
 const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)return {ok:false,retry:300,error:"bot_not_configured"};let appUrl:string|undefined;try{appUrl=botAppUrl()}catch{}
 const e=n.entity,menu={text:"🏠 Главное меню",callback_data:"shop:menu"},reply=e?.forceReply?{force_reply:true,input_field_placeholder:"Напишите сообщение или прикрепите фото"}:e?.keyboard?{inline_keyboard:[...e.keyboard,...(e.keyboard.some(row=>row.some(b=>b.callback_data==="shop:menu"))?[]:[[menu]])]}:appUrl?{inline_keyboard:[[{text:"Открыть магазин",web_app:{url:appUrl}}],[menu]]}:{inline_keyboard:[[menu]]};
 const request=async(method:string,payload:unknown|FormData)=>{const multipart=payload instanceof FormData;const response=await transport("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",...(!multipart?{headers:{"Content-Type":"application/json"}}:{}),body:multipart?payload:JSON.stringify(payload),signal:AbortSignal.timeout(9000)}),body=await response.json();return {ok:response.ok&&body.ok===true,retry:Math.max(15,Math.min(3600,Number(body.parameters?.retry_after)||60)),error:response.ok&&body.ok===true?"":"telegram_"+response.status};};
 try{
  if(e?.photo){let photo=e.photo;if(photo.startsWith("/api/media/")&&appUrl)photo=new URL(photo,appUrl).toString();const caption=n.text.length<=1024?n.text:n.text.split("\n")[0],payload={chat_id:n.user_id,photo,caption,...(n.text.length<=1024&&reply?{reply_markup:reply}:{})};let result;
   if(photo.startsWith("data:image/")){const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(photo);if(!match)return {ok:false,retry:3600,error:"invalid_photo"};const form=new FormData();form.set("chat_id",n.user_id);form.set("caption",caption);form.set("photo",new Blob([Buffer.from(match[2],"base64")],{type:"image/"+match[1]}),"shop."+match[1]);if(n.text.length<=1024&&reply)form.set("reply_markup",JSON.stringify(reply));result=await request("sendPhoto",form);}else result=await request("sendPhoto",payload);
   if(result.ok&&n.text.length<=1024)return result;
   // Preserve the text and links even if Telegram cannot load the optional image.
  }
  return await request("sendMessage",{chat_id:n.user_id,text:n.text,...(reply?{reply_markup:reply}:{})});
 }catch{return {ok:false,retry:60,error:"telegram_network_error"}}
}
export async function dispatchNotifications(){if(!notificationsEnabled()||!process.env.TELEGRAM_BOT_TOKEN)return {sent:0,failed:0,configured:false};const db=database(),started=Date.now();let sent=0,failed=0;
 for(let batch=0;batch<8&&Date.now()-started<30000;batch++){
 const rows=(await db.query(`WITH pending AS (SELECT id FROM app_notifications WHERE attempts<8 AND ((telegram_status IN ('queued','failed') AND next_attempt<=now()) OR (telegram_status='sending' AND locked_at<now()-interval '2 minutes')) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 5) UPDATE app_notifications n SET telegram_status='sending',attempts=n.attempts+1,locked_at=now() FROM pending WHERE n.id=pending.id RETURNING n.id,n.user_id,n.text,n.source,n.entity`)).rows;if(!rows.length)break;let batchFailed=false;
 await Promise.all(rows.map(async n=>{const r=await sendTelegramNotice(n);if(r.ok){await db.query("UPDATE app_notifications SET telegram_status='sent',sent_at=now(),locked_at=NULL,last_error='' WHERE id=$1",[n.id]);sent++;}else{await db.query("UPDATE app_notifications SET telegram_status='failed',locked_at=NULL,last_error=$2,next_attempt=now()+($3::int*interval '1 second') WHERE id=$1",[n.id,r.error,r.retry]);failed++;batchFailed=true;}}));if(batchFailed)break;
 }return {sent,failed,configured:true};}
