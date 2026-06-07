"use client";

import { useMemo, useState } from "react";
import { createProduct } from "@/app/actions";
import ProductIcon, { productIconOptions, suggestProductIcons } from "@/components/stock/product-icon";

const productCategories = ["Bebidas", "Comida", "Panadería", "Lácteos", "Limpieza", "Retail", "Tecnología", "Herramientas", "Insumos", "General"];

export default function ProductForm() {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [icon, setIcon] = useState("package");
  const suggestions = useMemo(() => suggestProductIcons(`${name} ${query}`).slice(0, 12), [name, query]);
  const iconCategories = [...new Set(productIconOptions.map((option) => option.category))];

  return (
    <form action={createProduct} className="premium-card grid gap-3 md:grid-cols-6">
      <input name="name" required value={name} onChange={(event) => { setName(event.target.value); const [first] = suggestProductIcons(event.target.value); if (first?.id) setIcon(first.id); }} className="premium-input md:col-span-2" placeholder="Nombre del producto" />
      <select name="category" required className="premium-input">
        <option value="">Categoría</option>
        {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
      <input name="quantity" required type="number" min="0" className="premium-input" placeholder="Stock actual" />
      <input name="purchase_price" required type="number" min="0" step="0.01" className="premium-input" placeholder="Costo" />
      <input name="sale_price" required type="number" min="0" step="0.01" className="premium-input" placeholder="Precio venta" />
      <input name="ideal_stock" type="number" min="0" className="premium-input" placeholder="Stock ideal" />
      <input type="hidden" name="icon" value={icon} />
      <input name="icon_search" value={query} onChange={(event) => setQuery(event.target.value)} className="premium-input md:col-span-2" placeholder="Buscar ícono: bebidas, limpieza, ropa..." />
      <textarea name="description" className="premium-input md:col-span-4" placeholder="Descripción del producto" />
      <div className="space-y-2 md:col-span-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((item) => <button key={item.id} type="button" onClick={() => setIcon(item.id)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${icon === item.id ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"}`}><ProductIcon icon={item.id} />{item.label}</button>)}
        </div>
        <p className="text-xs text-zinc-500">Catálogo visual buscable. Categorías disponibles: {iconCategories.join(" · ")}.</p>
      </div>
      <button className="premium-button">Agregar producto</button>
    </form>
  );
}
