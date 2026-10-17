/** Development access is never available on Vercel or a production server. */
export function isLocalRequest(request:Request):boolean {
 if(process.env.NODE_ENV!=="development" || process.env.LOCAL_DEV_MODE!=="1" || process.env.VERCEL)return false;
 const url=new URL(request.url);
 if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname))return false;
 const host=request.headers.get("host");
 if(host){try{const authority=new URL(url.protocol+"//"+host);if(!["localhost","127.0.0.1","[::1]"].includes(authority.hostname)||authority.port!==url.port)return false;}catch{return false;}}
 return true;
}
export function assertLocalOrigin(request:Request) {
 const origin=request.headers.get("origin");
 const url=new URL(request.url);const expectedOrigin=url.protocol+"//"+(request.headers.get("host")||url.host);
 if(request.headers.get("sec-fetch-site")==="cross-site" || (origin && origin!==expectedOrigin))throw new Error("Локальный вход доступен только со страницы этого магазина");
}
export const localIdentities=[
 {id:"998579758",first_name:"нукмо",username:"nukm0"},
 {id:"100000001",first_name:"Тестовый покупатель",username:"local_buyer"},
 {id:"100000002",first_name:"Тестовый заместитель",username:"local_deputy"},
] as const;
