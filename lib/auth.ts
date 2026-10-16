import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const telegramUser = z.object({id:z.number().int().positive().safe(),first_name:z.string().max(256),last_name:z.string().max(256).optional(),username:z.string().max(64).optional(),photo_url:z.string().max(2048).optional()});
export function validateInitData(raw:string, token:string, now = Math.floor(Date.now()/1000)) {
  if (!raw || raw.length>16384) throw new Error("Откройте магазин через Telegram");
  const data = new URLSearchParams(raw);
  if (new Set(data.keys()).size !== [...data.keys()].length) throw new Error("Некорректные данные Telegram");
  const hash = data.get("hash") || "";
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error("Некорректная подпись Telegram");
  data.delete("hash");
  const check = [...data.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join("\n");
  const secret = createHmac("sha256","WebAppData").update(token).digest();
  const expected = createHmac("sha256",secret).update(check).digest();
  if (!timingSafeEqual(expected,Buffer.from(hash,"hex"))) throw new Error("Не удалось подтвердить вход через Telegram");
  const date = Number(data.get("auth_date"));
  if (!Number.isInteger(date) || now-date>3600 || date>now+30) throw new Error("Сессия истекла. Закройте и откройте мини-приложение");
  const user = telegramUser.parse(JSON.parse(data.get("user") || "null"));
  return {...user, start_param:data.get("start_param") || ""};
}
export function roleFor(id:string, stored:string, ownerId=process.env.OWNER_TELEGRAM_ID) {
  return id===ownerId ? "owner" as const : stored==="deputy" ? "deputy" as const : "buyer" as const;
}
