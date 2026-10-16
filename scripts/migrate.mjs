import pg from 'pg';import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw new Error('Укажите DATABASE_URL в .env.local');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{await pool.query(await readFile(new URL('../db/001_initial.sql',import.meta.url),'utf8'));console.log('Схема базы данных готова');}finally{await pool.end();}
