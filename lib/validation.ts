import {z} from "zod";
const uuid=z.string().uuid();
export const telegramContact=z.string().trim().regex(/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/, "Укажите username Telegram").transform(v=>"@"+v.replace(/^@/,""));
const text=(max:number)=>z.string().trim().min(1).max(max);
const field=z.string().regex(/^(size|color|material|length|weight|quantity|custom_[0-9a-f-]{36})$/);
const measurements=z.array(z.object({key:field,unit:z.string().trim().max(20),label:z.string().trim().min(1).max(60).optional()})).max(30);
const theme=z.enum(["blue","purple","pink"]);
const picture=z.string().max(2800000).refine(v=>!v || /^\/demo-clothes\/(hoodie|pants|tee)\.svg$/.test(v) || /^\/api\/media\/[0-9a-f-]{36}$/.test(v) || /^https:\/\//i.test(v) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),"Нужна HTTPS-ссылка или изображение PNG/JPEG/WebP");
export const settingsSchema=z.object({name:text(80),description:z.string().trim().max(1000),theme,glow:theme,referral_reward:z.number().int().min(0).max(100000),purchase_percent:z.number().int().min(0).max(100),banners:z.array(z.object({id:uuid,title:text(100),subtitle:z.string().max(250),image_url:picture})).max(8)});
export const actionSchema=z.discriminatedUnion("action",[
 z.object({action:z.literal("image"),data:z.string().max(2800000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)}),
 z.object({action:z.literal("settings"),value:settingsSchema}),
 z.object({action:z.literal("category"),id:uuid.optional(),name:text(80),parent_id:uuid.nullable(),measurements:measurements.optional()}),
 z.object({action:z.literal("deleteCategory"),id:uuid}),
 z.object({action:z.literal("product"),id:uuid.optional(),title:text(150),description:z.string().max(5000),price:z.number().int().min(100).max(100000000),stock:z.number().int().min(0).max(1000000),category_id:uuid.nullable(),image_url:picture,active:z.boolean(),attributes:z.partialRecord(field,z.string().trim().max(80)).optional(),delivery_price:z.number().int().min(0).max(10000000).optional(),show_delivery:z.boolean().optional()}),
 z.object({action:z.literal("deleteProduct"),id:uuid}),
 z.object({action:z.literal("theme"),theme:theme.nullable()}),
 z.object({action:z.literal("transferOwner"),id:z.string().regex(/^[1-9]\d{0,15}$/)}),
 z.object({action:z.literal("deputy"),id:z.string().regex(/^[1-9]\d{0,15}$/),enabled:z.boolean()}),
 z.object({action:z.literal("order"),idempotency_key:uuid,items:z.array(z.object({productId:uuid,quantity:z.number().int().min(1).max(99)})).min(1).max(50),contact:telegramContact,address:text(1000),comment:z.string().trim().max(1000).optional()}),
 z.object({action:z.literal("orderStatus"),id:uuid,status:z.enum(["cancelled","shipped","completed"])})
]);
export function rublesToKopecks(input:string) {
 if(!/^\d{1,7}([.,]\d{1,2})?$/.test(input)) throw new Error("Цена: число с точностью до копеек");
 return Math.round(Number(input.replace(",","."))*100);
}
