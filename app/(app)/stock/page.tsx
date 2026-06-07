import { deleteProduct, registerStockMovement, updateProduct } from "@/app/actions";
import Sidebar from "@/components/dashboard/sidebar";
import ProductForm from "@/components/stock/product-form";
import ProductIcon from "@/components/stock/product-icon";
import { resolveActiveStoreId } from "@/lib/server/store";

function stockStatus(quantity: number, alert: number) { return quantity <= 0 ? ["🔴", "Crítico", "bg-red-500/10 text-red-600"] : quantity <= alert ? ["🟡", "Bajo", "bg-yellow-500/10 text-yellow-600"] : ["🟢", "Saludable", "bg-emerald-500/10 text-emerald-600"]; }

type ProductRow = { id: string; name: string; category?: string | null; icon?: string | null; description?: string | null; quantity: number | string; purchase_price: number | string; sale_price: number | string; low_stock_alert?: number | string | null; ideal_stock?: number | string | null };

export default async function StockPage() {
  const { supabase, storeId, role, activeStoreName, activeStoreLogo } = await resolveActiveStoreId();
  const canManage = role === "owner" || role === "manager";
  const { data } = await supabase.from("stock_products").select("id,name,category,icon,description,quantity,purchase_price,sale_price,low_stock_alert,ideal_stock").eq("store_id", storeId).order("created_at", { ascending: false });
  const products = (data ?? []) as ProductRow[];

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] md:grid md:grid-cols-[280px_1fr]">
      <Sidebar role={role} activeStoreName={activeStoreName} activeStoreLogo={activeStoreLogo} />
      <section className="space-y-6 p-4 md:p-10">
        <header className="premium-card">
          <p className="text-sm font-semibold text-blue-600">📦 Inventario • {activeStoreName}</p>
          <h2 className="text-4xl font-semibold tracking-tight">Inventario</h2>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Productos por tienda con categoría, ícono profesional, costos y precio de venta obligatorio.</p>
        </header>
        {canManage ? <ProductForm /> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.length === 0 ? <div className="premium-card text-sm text-zinc-500">Sin productos cargados.</div> : null}
          {products.map((product) => {
            const [statusIcon, label, tone] = stockStatus(Number(product.quantity), Number(product.low_stock_alert ?? 5));
            return (
              <article key={product.id} className="premium-card space-y-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-600"><ProductIcon icon={product.icon} className="h-8 w-8" /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{product.category ?? "General"}</p>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-zinc-500">Costo ${product.purchase_price} · Venta ${product.sale_price}</p>
                  </div>
                </div>
                {product.description ? <p className="rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-500 dark:bg-black/20">{product.description}</p> : null}
                <div className="flex items-center justify-between"><span className={`rounded-full px-3 py-1 text-xs ${tone}`}>{statusIcon} {label}</span><span className="text-3xl font-semibold">{product.quantity}</span></div>
                <div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600"><p className="text-xs opacity-75">Stock ideal</p><b>{product.ideal_stock ?? 0}</b></div><div className="rounded-2xl bg-orange-500/10 p-3 text-orange-600"><p className="text-xs opacity-75">Faltante</p><b>{Math.max(0, Number(product.ideal_stock ?? 0) - Number(product.quantity ?? 0))}</b></div></div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <form action={registerStockMovement}><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="type" value="sale" /><input type="hidden" name="quantity" value="1" /><button className="w-full rounded-2xl bg-red-500/10 py-3 font-semibold text-red-600">-1</button></form>
                  <span className="text-sm text-zinc-400">stock</span>
                  <form action={registerStockMovement}><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="type" value="incoming_stock" /><input type="hidden" name="quantity" value="1" /><button className="w-full rounded-2xl bg-emerald-500/10 py-3 font-semibold text-emerald-600">+1</button></form>
                </div>
                {canManage ? <details className="rounded-2xl bg-zinc-50 p-3 dark:bg-black/20"><summary className="cursor-pointer text-sm font-medium">✏️ Editar producto</summary><form action={updateProduct} className="mt-3 grid gap-2"><input type="hidden" name="product_id" value={product.id} /><input name="icon" defaultValue={product.icon ?? "package"} className="premium-input" placeholder="Icono (ej: cup-soda)" /><input name="name" defaultValue={product.name} required className="premium-input" /><input name="category" defaultValue={product.category ?? "General"} required className="premium-input" /><textarea name="description" defaultValue={product.description ?? ""} className="premium-input" /><input type="number" name="quantity" defaultValue={product.quantity} required className="premium-input" /><input type="number" name="purchase_price" defaultValue={product.purchase_price} required className="premium-input" /><input type="number" name="sale_price" defaultValue={product.sale_price} required className="premium-input" /><input type="number" name="ideal_stock" defaultValue={product.ideal_stock ?? 0} className="premium-input" placeholder="Stock ideal" /><button className="premium-button">Guardar</button></form><form action={deleteProduct} className="mt-2"><input type="hidden" name="product_id" value={product.id} /><button className="w-full rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600">🗑 Eliminar</button></form></details> : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
