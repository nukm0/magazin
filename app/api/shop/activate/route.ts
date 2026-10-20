import {NextResponse} from "next/server";import {activateLive} from "@/lib/live-store";import {ApiError} from "@/lib/store";import {databaseError} from "@/lib/database-error";
export const runtime="nodejs";export const maxDuration=60;
export async function POST(request:Request){try{return NextResponse.json(await activateLive(request))}catch(e){return NextResponse.json({error:e instanceof ApiError?e.message:databaseError(e).message},{status:e instanceof ApiError?e.status:503})}}
