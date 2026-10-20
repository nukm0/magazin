import {notificationsEnabled,dispatchNotifications} from "@/lib/notification-outbox.server";
import {NextResponse,after} from "next/server";
import {isLocalRequest} from "@/lib/local-mode";
import {ZodError} from "zod";
import {ApiError,mutate,snapshot} from "@/lib/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function fail(error:unknown){
 if(error instanceof ApiError)return NextResponse.json({error:error.message},{status:error.status});
 if(error instanceof Error && "status" in error && typeof error.status==="number")return NextResponse.json({error:error.message},{status:error.status});
 if(error instanceof ZodError)return NextResponse.json({error:error.issues[0]?.message||"Проверьте поля формы"},{status:400});
 if(error && typeof error==="object" && "code" in error && error.code==="23503")return NextResponse.json({error:"Категория используется. Сначала перенесите товары и подкатегории."},{status:409});
 console.error("Store request failed",error instanceof Error?error.name:"unknown");
 return NextResponse.json({error:"Не удалось обратиться к базе магазина. Проверьте подключение и миграцию."},{status:503});
}
export async function GET(request:Request){try{return NextResponse.json(isLocalRequest(request)?(await import("@/lib/local-store")).localSnapshot(request):await snapshot(request));}catch(e){return fail(e);}}
export async function POST(request:Request){
 if(Number(request.headers.get("content-length")||0)>4000000)return NextResponse.json({error:"Изображение слишком большое"},{status:413});
 try{const raw=await request.text();if(raw.length>4000000)return NextResponse.json({error:"Запрос слишком большой"},{status:413});const local=isLocalRequest(request),result=local?(await import("@/lib/local-store")).localMutate(request,JSON.parse(raw)):await mutate(request,JSON.parse(raw));if(!local&&notificationsEnabled())after(async()=>{try{await dispatchNotifications()}catch{console.error("Notification dispatch unavailable")}});return NextResponse.json(result);}catch(e){if(e instanceof SyntaxError)return NextResponse.json({error:"Некорректный запрос"},{status:400});return fail(e);}
}
