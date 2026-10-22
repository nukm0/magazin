import {safeBannerLink} from "./banners";
import {z} from "zod";
const uuid=z.string().uuid();
export const telegramContact=z.string().trim().regex(/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/, "Укажите username Telegram").transform(v=>"@"+v.replace(/^@/,""));
const text=(max:number)=>z.string().trim().min(1).max(max);
const field=z.string().regex(/^(size|color|material|length|weight|quantity|custom_[0-9a-f-]{36})$/);
const measurements=z.array(z.object({key:field,unit:z.string().trim().max(20),label:z.string().trim().min(1).max(60).optional()})).max(30);
const theme=z.enum(["blue","purple","pink"]);
const picture=z.string().max(2800000).refine(v=>!v || /^\/demo-clothes\/(hoodie|pants|tee)\.svg$/.test(v) || /^\/api\/media\/[0-9a-f-]{36}$/.test(v) || /^https:\/\//i.test(v) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),"Нужна HTTPS-ссылка или изображение PNG/JPEG/WebP");
const jobs=z.object({enabled:z.boolean(),text:z.string().trim().max(3000),url:z.string().trim().max(2000).refine(v=>{if(!v)return true;try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password}catch{return false}},"Укажите HTTPS-ссылку для отклика")}).refine(v=>!v.enabled||!!v.text&&!!v.url,"Для показа вакансии заполните текст и ссылку");
export const settingsSchema=z.object({jobs:jobs.optional(),logo_url:picture.optional(),rental_description:z.string().trim().max(1000).optional(),name:text(80),description:z.string().trim().max(1000),theme,glow:theme,referral_reward:z.number().int().min(0).max(100000),purchase_percent:z.number().int().min(0).max(100),banners:z.array(z.object({id:uuid,title:text(100),subtitle:z.string().max(250),image_url:picture,color:z.enum(["pink","blue","red"]).optional(),link_url:z.string().trim().max(2000).refine(v=>!v||safeBannerLink(v)!==null,"Нужна HTTPS-ссылка, путь /раздел или #якорь").optional()})).max(8)});
export const actionSchema=z.discriminatedUnion("action",[
 z.object({action:z.literal("image"),data:z.string().max(2800000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)}),
 z.object({action:z.literal("settings"),value:settingsSchema}),
 z.object({action:z.literal("category"),id:uuid.optional(),name:text(80),parent_id:uuid.nullable(),image_url:picture.optional(),measurements:measurements.optional()}),
 z.object({action:z.literal("deleteCategory"),id:uuid}),
 z.object({action:z.literal("characteristic"),key:z.string().regex(/^custom_[0-9a-f-]{36}$/),label:text(60),unit:z.string().trim().max(20)}),
 z.object({action:z.literal("deleteCharacteristic"),key:z.string().regex(/^custom_[0-9a-f-]{36}$/)}),
 z.object({action:z.literal("product"),crm_id:uuid.optional(),seller_rate:z.number().int().min(0).max(100000000).nullable().optional(),no_seller_payment:z.boolean().optional(),id:uuid.optional(),title:text(150),description:z.string().max(5000),price:z.number().int().min(100).max(100000000),unit_cost:z.number().int().min(0).max(100000000).nullable().optional(),stock:z.number().int().min(0).max(1000000),category_id:uuid.nullable(),image_url:picture,active:z.boolean(),variant_label:z.string().trim().max(60).optional(),variant_stocks:z.array(z.object({name:text(80),stock:z.number().int().min(0).max(1000000)})).max(30).optional(),attributes:z.partialRecord(field,z.string().trim().max(80)).optional(),delivery_price:z.number().int().min(0).max(10000000).optional(),show_delivery:z.boolean().optional()}),
 z.object({action:z.literal("deleteProduct"),id:uuid}),
 z.object({action:z.literal("theme"),theme:theme.nullable()}),
 z.object({action:z.literal("transferOwner"),id:z.string().regex(/^[1-9]\d{0,15}$/)}),
 z.object({action:z.literal("deputy"),id:z.string().regex(/^[1-9]\d{0,15}$/),enabled:z.boolean()}),
 z.object({action:z.literal("order"),payment_method:z.enum(["cash","online"]).default("cash"),idempotency_key:uuid,items:z.array(z.object({productId:uuid,quantity:z.number().int().min(1).max(99),variant:z.string().trim().max(80).optional()})).min(1).max(50),contact:telegramContact,address:text(1000),comment:z.string().trim().max(1000).optional()}),
 z.object({action:z.literal("orderStatus"),id:uuid,status:z.enum(["cancelled","shipped","completed"])})
]);
export function rublesToKopecks(input:string) {
 if(!/^\d{1,7}([.,]\d{1,2})?$/.test(input)) throw new Error("Цена: число с точностью до копеек");
 return Math.round(Number(input.replace(",","."))*100);
}
