import { Pool, type PoolClient } from "pg";
const state = globalThis as unknown as {magazinPool?:Pool};
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("База данных ещё не подключена");
  return state.magazinPool ??= new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:8000,idleTimeoutMillis:10000});
}
export async function transaction<T>(work:(client:PoolClient)=>Promise<T>):Promise<T> {
  const client = await database().connect();
  try {await client.query("BEGIN");const result = await work(client);await client.query("COMMIT");return result;}
  catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
}
