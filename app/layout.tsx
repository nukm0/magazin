import type {Metadata} from "next";
import Script from "next/script";
import "./globals.css";
export const metadata:Metadata={title:"Магазин · Telegram",description:"Каталог и личный кабинет вашего магазина в Telegram"};
export default function Layout({children}:{children:React.ReactNode}){
 return <html lang="ru" suppressHydrationWarning><head><Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive"/></head><body>{children}</body></html>;
}
