import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/sidebar";
import { resolveActiveStoreId } from "@/lib/server/store";

type Row = { id: string; type: string; quantity: number | string; purchase_price: number | string; sale_price: number | string; profit: number | string; created_at: string; product_id?: string | null; employee_id?: string | null; description?: string | null };
type ProductRow = { id: string; name: string; icon?: string | null };
type PersonRow = { profile_id: string; name: string };

export default async function AccountingPage() {
  const { supabase, storeId, role, activeStoreName, activeStoreLogo } = await resolveActiveStoreId();
  if (role === "employee") redirect('/dashboard');
  const [{ data: rawRows }, { data: products }, { data: people }] = await Promise.all([
    supabase.from("accounting_records").select("id,type,quantity,purchase_price,sale_price,profit,created_at,product_id,employee_id,description").eq("store_id", storeId).order("created_at", { ascending: false }).limit(60),
    supabase.from("stock_products").select("id,name,icon").eq("store_id", storeId),
    supabase.from("employees").select("profile_id,name").eq("store_id", storeId)
  ]);
  const rows = (rawRows ?? []) as Row[];
  const productName = new Map(((products ?? []) as ProductRow[]).map((product) => [product.id, `${product.icon ?? "📦"} ${product.name}`]));
  const personName = new Map(((people ?? []) as PersonRow[]).map((person) => [person.profile_id, person.name]));
  const revenue = rows.filter((row) => row.type === "sale").reduce((sum, row) => sum + Number(row.sale_price) * Number(row.quantity), 0);
  const profit = rows.reduce((sum, row) => sum + Number(row.profit), 0);
  const expenses = rows.filter((row) => row.type === "stock_entry" || row.type === "expense").reduce((sum, row) => sum + Number(row.purchase_price) * Number(row.quantity), 0);
  return <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] md:grid md:grid-cols-[280px_1fr]"><Sidebar role={role} activeStoreName={activeStoreName} activeStoreLogo={activeStoreLogo}/><section className="space-y-6 p-6 md:p-10"><header className="premium-card"><p className="text-sm font-semibold text-blue-600">💰 Finanzas • {activeStoreName}</p><h2 className="text-4xl font-semibold tracking-tight">Finanzas</h2></header><div className="grid gap-4 md:grid-cols-3"><article className="rounded-[2rem] border border-blue-500/20 bg-blue-500/10 p-6 text-blue-600 shadow-xl"><p>💰 Ingresos</p><h3 className="text-3xl font-semibold">${revenue.toFixed(2)}</h3><p className="text-xs">ventas registradas</p></article><article className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-6 text-emerald-600 shadow-xl"><p>📈 Ganancia</p><h3 className="text-3xl font-semibold">${profit.toFixed(2)}</h3><p className="text-xs">ganancia estimada</p></article><article className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-6 text-red-600 shadow-xl"><p>📉 Gastos</p><h3 className="text-3xl font-semibold">${expenses.toFixed(2)}</h3><p className="text-xs">compras / entradas</p></article></div><section className="premium-card"><h3 className="mb-4 font-semibold">Resumen mensual</h3><div className="h-36 rounded-3xl bg-gradient-to-r from-blue-600/20 via-emerald-500/20 to-red-500/20 p-4 text-sm text-zinc-500">Tendencias de ingresos, ganancias y gastos</div></section><section className="grid gap-3">{rows.length === 0 ? <p className="premium-card text-zinc-500">Sin registros.</p> : rows.map((row) => { const total = Number(row.sale_price || row.purchase_price) * Number(row.quantity); const date = new Date(row.created_at); const title = row.type === "expense" ? `Gasto · ${row.description ?? "Gasto del día"}` : `${row.type} · ${productName.get(row.product_id ?? "") ?? "Producto"}`; const notes = row.type === "expense" ? row.description ?? "Gasto cargado manualmente en el dashboard." : "Generado automáticamente por movimiento de inventario."; return <details key={row.id} className="premium-card text-sm"><summary className="flex cursor-pointer items-center justify-between gap-3"><span className="min-w-0 truncate">{title}</span><span className={Number(row.profit) >= 0 ? "text-emerald-600" : "text-red-600"}>${total.toFixed(2)}</span></summary><div className="mt-4 grid gap-2 text-zinc-500 md:grid-cols-2"><p>Responsable: <b>{personName.get(row.employee_id ?? "") ?? "Sistema"}</b></p><p>Fecha: {date.toLocaleDateString('es-AR')} · Hora: {date.toLocaleTimeString('es-AR')}</p><p>Cantidad: {row.quantity}</p><p>Precio compra: ${row.purchase_price}</p><p>Precio venta: ${row.sale_price}</p><p>Ganancia: ${row.profit}</p><p className="md:col-span-2">Notas: {notes}</p></div></details>})}</section></section></main>;
}
