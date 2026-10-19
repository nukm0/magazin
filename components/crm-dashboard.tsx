"use client";
import {crmDemoDocument} from "@/lib/crm-demo-document";
import type {Profile} from "@/lib/types";
export default function CrmDashboard({role}:{role:Profile["role"]}){if(role!=="owner"&&role!=="deputy")return null;return <section className="stack"><div className="info-box">CRM очищена от тестовых данных. Подключение к заказам и остаткам магазина пока не настроено.</div><iframe title="CRM магазина" className="crm-demo-frame" srcDoc={crmDemoDocument} sandbox="allow-scripts allow-same-origin allow-modals allow-forms" referrerPolicy="no-referrer"/></section>;}
