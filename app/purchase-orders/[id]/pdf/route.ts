import { NextResponse } from "next/server";
import { resolveActiveStoreId } from "@/lib/server/store";

type PdfItem = { category: string; product_name: string; quantity_requested: number | string; notes: string | null };
const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, storeId, activeStoreName } = await resolveActiveStoreId();
  const [{ data: store }, { data: order }, { data: items }] = await Promise.all([
    supabase.from("stores").select("name,address,logo_url").eq("id", storeId).single(),
    supabase.from("purchase_orders").select("id,title,order_type,status,supplier_name,supplier_notes,created_at,approved_at").eq("id", id).eq("store_id", storeId).single(),
    supabase.from("purchase_order_items").select("category,product_name,quantity_requested,notes").eq("purchase_order_id", id).eq("store_id", storeId).order("category")
  ]);
  if (!order) return new NextResponse("Orden no encontrada", { status: 404 });
  const itemRows = (items ?? []) as PdfItem[];
  const groups = itemRows.reduce<Record<string, PdfItem[]>>((acc, item) => { (acc[item.category] ??= []).push(item); return acc; }, {});
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(order.title)} · CLASS</title><style>body{font-family:Inter,Arial,sans-serif;margin:40px;color:#111827}.brand{display:flex;align-items:center;gap:16px;border-bottom:1px solid #e5e7eb;padding-bottom:24px}.logo{width:56px;height:56px;border-radius:18px;background:#2563eb;color:white;display:grid;place-items:center;font-weight:800}.badge{display:inline-block;border-radius:999px;background:#dbeafe;color:#1d4ed8;padding:6px 12px;font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.card{border:1px solid #e5e7eb;border-radius:18px;padding:16px}.cat{margin-top:24px}.row{display:grid;grid-template-columns:1fr 80px 1fr;border-bottom:1px solid #f3f4f6;padding:10px 0}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Imprimir / Guardar PDF</button><section class="brand"><div class="logo">C</div><div><h1>Pedido CLASS</h1><p>${escapeHtml(store?.name ?? activeStoreName)} · ${escapeHtml(store?.address ?? "")}</p></div></section><div class="grid"><div class="card"><b>Orden</b><p>${escapeHtml(order.title)}</p></div><div class="card"><b>Proveedor</b><p>${escapeHtml(order.supplier_name || "—")}</p></div><div class="card"><b>Estado</b><p><span class="badge">${escapeHtml(order.status)}</span></p></div><div class="card"><b>Creación</b><p>${new Date(order.created_at).toLocaleDateString("es-AR")}</p></div><div class="card"><b>Aprobación</b><p>${order.approved_at ? new Date(order.approved_at).toLocaleDateString("es-AR") : "—"}</p></div><div class="card"><b>Tipo</b><p>${escapeHtml(order.order_type)}</p></div></div>${Object.entries(groups).map(([category, rows]) => `<section class="cat"><h2>${category.replaceAll("_", " ").toUpperCase()}</h2>${rows.map((item) => `<div class="row"><span>${escapeHtml(item.product_name)}</span><b>${item.quantity_requested}</b><span>${escapeHtml(item.notes || "")}</span></div>`).join("")}</section>`).join("")}<section class="cat"><h2>Notas</h2><p>${escapeHtml(order.supplier_notes || "Sin notas.")}</p></section></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
