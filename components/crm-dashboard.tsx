"use client";
import {crmDemoDocument} from "@/lib/crm-demo-document";
import CrmProducts from "./crm-products";
import type {Action} from "./workspace-ui";
import StaffKpi from "./audit-dashboard";
import type {Profile,Snapshot} from "@/lib/types";
export default function CrmDashboard({role,data,act,busy}:{role:Profile["role"];data:Snapshot;act:Action;busy:boolean}){if(role!=="owner"&&role!=="deputy")return null;return <section className="stack"><div className="info-box">KPI сотрудников связан с ревизиями и завершёнными заказами приложения. Основные таблицы CRM ниже пока ведутся отдельно.</div><CrmProducts data={data} act={act} busy={busy}/><StaffKpi data={data}/><iframe title="CRM магазина" className="crm-demo-frame" srcDoc={crmDemoDocument} sandbox="allow-scripts allow-same-origin allow-modals allow-forms" referrerPolicy="no-referrer"/></section>;}
