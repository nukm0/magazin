import {welcomeMessage} from "@/lib/bot-messages";
import {webhookSecret} from "@/lib/bot-config";
import {timingSafeEqual} from "node:crypto";
import {notificationsEnabled,enqueueNotice,dispatchNotifications} from "@/lib/notification-outbox.server";
import {transaction} from "@/lib/db";
import {NextResponse,after} from "next/server";
export const runtime="nodejs";
async function botCall(method:string,body:unknown){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)throw new Error("Bot not configured");
 const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(7000)});
 const result=await response.json();if(!result.ok)throw new Error("Telegram API failure");
}
export async function POST(request:Request){
 let expected:string;try{expected=webhookSecret()}catch{return NextResponse.json({ok:false},{status:503})}const provided=request.headers.get("x-telegram-bot-api-secret-token")||"";
 if(expected.length<32 || Buffer.byteLength(expected)!==Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return NextResponse.json({ok:false},{status:401});
 try{
 const update=await request.json();
 if(update.pre_checkout_query)await botCall("answerPreCheckoutQuery",{pre_checkout_query_id:update.pre_checkout_query.id,ok:false,error_message:"Приём онлайн-платежей пока не подключён."});
 const m=update.message,command=/^\/(start|help)(?:@\w+)?(?:\s|$)/.exec(m?.text||"")?.[1];
 if(m?.chat?.type==="private"&&command&&String(m.from?.id)===String(m.chat.id)){
  const id=String(m.from.id);
  if(!notificationsEnabled())return NextResponse.json({ok:false},{status:503});
  await transaction(async c=>{
   const shop=(await c.query("SELECT data FROM settings WHERE id=1")).rows[0]?.data||{};
   const owner=(await c.query("SELECT owner_id FROM ownership WHERE id=1")).rows[0]?.owner_id||process.env.OWNER_TELEGRAM_ID;
   const profile=(await c.query("SELECT role FROM profiles WHERE id=$1",[id])).rows[0];
   const role=id===owner?"owner":profile?.role==="deputy"?"deputy":profile?.role==="seller"?"seller":"buyer";
   if(command==="start"){const ref=/^\/start(?:@\w+)?\s+ref_([1-9]\d{0,15})$/.exec(m.text||"")?.[1];await c.query("INSERT INTO bot_starts(user_id,referred_by) VALUES($1,(SELECT id FROM profiles WHERE id=$2 AND id<>$1)) ON CONFLICT(user_id) DO NOTHING",[id,ref||null]);}
   await enqueueNotice(c,id,welcomeMessage(shop,{id,first_name:m.from.first_name,username:m.from.username,role},command==="help"),command+":"+String(m.message_id));
  });
  after(async()=>{try{await dispatchNotifications()}catch{console.error("Notification dispatch unavailable")}});
 }

 return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:false},{status:500});}
}
