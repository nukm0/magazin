import {timingSafeEqual} from "node:crypto";
import {database} from "@/lib/db";
import {NextResponse} from "next/server";
export const runtime="nodejs";
async function botCall(method:string,body:unknown){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)throw new Error("Bot not configured");
 const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(7000)});
 const result=await response.json();if(!result.ok)throw new Error("Telegram API failure");
}
export async function POST(request:Request){
 const expected=process.env.TELEGRAM_WEBHOOK_SECRET||"",provided=request.headers.get("x-telegram-bot-api-secret-token")||"";
 if(expected.length<32 || Buffer.byteLength(expected)!==Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return NextResponse.json({ok:false},{status:401});
 try{
 const update=await request.json();
 if(update.pre_checkout_query)await botCall("answerPreCheckoutQuery",{pre_checkout_query_id:update.pre_checkout_query.id,ok:false,error_message:"Приём онлайн-платежей пока не подключён."});
 const m=update.message;
 if(m?.chat?.type==="private" && /^\/start(?:@\w+)?(?:\s|$)/.test(m.text||"") && process.env.APP_URL){
  if(process.env.DATABASE_URL&&String(m.from?.id)===String(m.chat.id)){const ref=/^\/start(?:@\w+)?\s+ref_([1-9]\d{0,15})$/.exec(m.text||"")?.[1];await database().query("INSERT INTO bot_starts(user_id,referred_by) VALUES($1,(SELECT id FROM profiles WHERE id=$2 AND id<>$1)) ON CONFLICT(user_id) DO NOTHING",[String(m.from.id),ref||null]);}
  await botCall("sendMessage",{chat_id:m.chat.id,text:"Добро пожаловать! Каталог, корзина и личный кабинет доступны в магазине.",reply_markup:{inline_keyboard:[[{text:"Открыть магазин",web_app:{url:process.env.APP_URL}}]]}});
 }
 return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:false},{status:500});}
}
