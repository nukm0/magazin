import {existsSync} from "node:fs";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
const next=fileURLToPath(new URL("../node_modules/next/dist/bin/next",import.meta.url));
const child=spawn(process.execPath,[next,"dev","--hostname","127.0.0.1","--port","3000"],{stdio:"inherit",env:{...process.env,LOCAL_DEV_MODE:"1",NODE_PATH:fileURLToPath(new URL("../node_modules",import.meta.url)),...(existsSync("D:/Codex/magazin-local/data")?{LOCAL_STORE_PATH:"D:/Codex/magazin-local/data/shop.sqlite"}:{}),OWNER_TELEGRAM_ID:"998579758"}});
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
child.on("exit",code=>process.exit(code??0));
