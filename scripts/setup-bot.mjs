const {TELEGRAM_BOT_TOKEN,TELEGRAM_WEBHOOK_SECRET,APP_URL}=process.env;
if(!TELEGRAM_BOT_TOKEN||!TELEGRAM_WEBHOOK_SECRET||!/^[A-Za-z0-9_-]{32,256}$/.test(TELEGRAM_WEBHOOK_SECRET)||!APP_URL?.startsWith('https://'))throw new Error('Заполните TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET (32+ символов: буквы/цифры/_/-) и APP_URL в .env.local');
async function call(method,body){const res=await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const result=await res.json();if(!result.ok)throw new Error(`Не удалось выполнить ${method}. Проверьте настройки бота.`);}
await call('setChatMenuButton',{menu_button:{type:'web_app',text:'Открыть магазин',web_app:{url:APP_URL}}});
await call('setWebhook',{url:APP_URL.replace(/\/$/,'')+'/api/telegram',secret_token:TELEGRAM_WEBHOOK_SECRET,allowed_updates:['message','pre_checkout_query'],drop_pending_updates:false});
console.log('Кнопка магазина и webhook подключены. В BotFather задайте Main Mini App URL для реферальных ссылок.');
