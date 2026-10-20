// Public diagnostics contain only fixed labels, never connection strings or raw errors.
export function databaseError(error:unknown){
 const e=error&&typeof error==="object"?error as {code?:unknown;message?:unknown;cause?:unknown}:{};
 const code=typeof e.code==="string"?e.code:"";
 const messages:Record<string,string>={
 "28P01":"База отклонила пароль. Проверьте DATABASE_URL в Vercel и повторите публикацию.",
 "28000":"База отклонила авторизацию. Проверьте пользователя и пароль в DATABASE_URL.",
 "42P01":"В базе отсутствуют таблицы магазина. Выполните SQL установки в нужном проекте Supabase.",
 "42703":"Схема базы устарела. Выполните актуальный SQL установки магазина.",
 "42501":"У подключения нет прав на таблицы магазина.",
 "ENOTFOUND":"Не найден сервер базы. Проверьте адрес в DATABASE_URL.",
 "ECONNREFUSED":"Сервер базы отклонил соединение. Проверьте адрес и порт подключения.",
 "ETIMEDOUT":"Сервер базы не ответил вовремя. Проверьте доступность проекта и Transaction pooler.",
 "SELF_SIGNED_CERT_IN_CHAIN":"Не удалось проверить сертификат базы. Требуется настройка защищённого подключения.",
 "CERT_HAS_EXPIRED":"Сертификат базы истёк. Требуется проверка защищённого подключения."
 };
 if(messages[code])return {code,message:messages[code]};
 if(typeof e.message==="string"&&/Tenant or user not found/i.test(e.message))return {code:"DB_TENANT",message:"Не найден проект или пользователь подключения. Проверьте адрес pooler и имя postgres.<project_id> в DATABASE_URL."};
 return {code:"DB_UNAVAILABLE",message:"Не удалось обратиться к базе магазина. Проверьте подключение и миграцию."};
}
