"use client";
import {crmDemoDocument} from "@/lib/crm-demo-document";
import type {Profile} from "@/lib/types";
export default function CrmDashboard({role}:{role:Profile["role"]}){if(role!=="owner"&&role!=="deputy")return null;return <section className="stack"><div className="info-box">Тестовая CRM на продуктах. Закупки, покупатели и заказы ниже — демонстрационные. Данные витрины и реальные остатки магазина не изменяются.</div><iframe title="CRM магазина — тестовые данные продуктов" className="crm-demo-frame" srcDoc={crmDemoDocument} sandbox="allow-scripts allow-same-origin allow-modals" referrerPolicy="no-referrer"/></section>;}
