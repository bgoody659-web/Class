import { Apple, Beef, BriefcaseBusiness, Car, Coffee, Croissant, CupSoda, Droplets, Hammer, Milk, Package, Pill, Plug, Shirt, SprayCan, type LucideIcon } from "lucide-react";

export type ProductIconId =
  | "package" | "cup-soda" | "wine" | "coffee" | "water" | "food" | "bakery" | "milk" | "produce" | "meat"
  | "cleaning" | "clothing" | "retail" | "technology" | "tools" | "office" | "pharmacy" | "automotive"
  | "services" | "supplies" | "general-product";

export const productIconOptions: { id: ProductIconId; label: string; category: string; keywords: string[] }[] = [
  { id: "cup-soda", label: "Gaseosa / bebida", category: "Bebidas", keywords: ["coca", "cola", "sprite", "pepsi", "fanta", "gaseosa", "bebida", "jugo", "soda", "lata", "energizante"] },
  { id: "wine", label: "Vino / bar", category: "Bebidas", keywords: ["vino", "vinoteca", "cerveza", "bar", "alcohol", "champagne", "whisky"] },
  { id: "coffee", label: "Café / té", category: "Bebidas", keywords: ["cafe", "café", "te", "té", "capuccino", "latte", "espresso"] },
  { id: "water", label: "Agua", category: "Bebidas", keywords: ["agua", "mineral", "soda"] },
  { id: "food", label: "Comida preparada", category: "Comida", keywords: ["hamburguesa", "burger", "comida", "restaurante", "papas", "pizza", "sandwich", "sándwich", "empanada", "milanesa"] },
  { id: "bakery", label: "Panadería", category: "Panadería", keywords: ["pan", "factura", "panadería", "panaderia", "bakery", "medialuna", "torta", "budin"] },
  { id: "milk", label: "Lácteos", category: "Lácteos", keywords: ["leche", "queso", "yogur", "yoghurt", "crema", "lácteo", "lacteo"] },
  { id: "produce", label: "Frutas / verduras", category: "Comida", keywords: ["lechuga", "tomate", "verdura", "fruta", "manzana", "papa", "cebolla", "zanahoria"] },
  { id: "meat", label: "Carnes", category: "Comida", keywords: ["carne", "pollo", "cerdo", "beef", "pescado", "fiambre"] },
  { id: "cleaning", label: "Limpieza", category: "Limpieza", keywords: ["detergente", "lavandina", "limpieza", "desinfectante", "jabón", "jabon", "spray", "escoba", "trapo"] },
  { id: "clothing", label: "Indumentaria", category: "Retail", keywords: ["remera", "camisa", "ropa", "pantalón", "pantalon", "buzo", "zapatilla", "vestido"] },
  { id: "retail", label: "Retail / tienda", category: "Retail", keywords: ["retail", "tienda", "local", "venta", "mostrador", "bolsa", "regalo"] },
  { id: "technology", label: "Tecnología", category: "Tecnología", keywords: ["cable", "cargador", "electrónica", "electronica", "auricular", "celular", "telefono", "usb", "hdmi"] },
  { id: "tools", label: "Herramientas", category: "Herramientas", keywords: ["martillo", "herramienta", "tornillo", "repuesto", "llave", "taladro"] },
  { id: "office", label: "Oficina", category: "Oficina", keywords: ["papel", "lapicera", "oficina", "cuaderno", "carpeta", "ticket"] },
  { id: "pharmacy", label: "Farmacia", category: "Farmacia", keywords: ["medicamento", "farmacia", "pastilla", "alcohol", "curita", "salud"] },
  { id: "automotive", label: "Automotor", category: "Automotor", keywords: ["auto", "aceite", "repuesto", "rueda", "cubierta", "motor"] },
  { id: "services", label: "Servicios", category: "Servicios", keywords: ["servicio", "turno", "consulta", "mantenimiento"] },
  { id: "supplies", label: "Insumos", category: "Insumos", keywords: ["insumo", "descartable", "pack", "caja", "bolsa", "servilleta"] },
  { id: "general-product", label: "Producto general", category: "General", keywords: ["producto", "general", "varios"] },
  { id: "package", label: "Caja / sin categoría", category: "General", keywords: [] }
];

const icons: Record<ProductIconId, LucideIcon> = {
  package: Package,
  "cup-soda": CupSoda,
  wine: CupSoda,
  coffee: Coffee,
  water: Droplets,
  food: Beef,
  bakery: Croissant,
  milk: Milk,
  produce: Apple,
  meat: Beef,
  cleaning: SprayCan,
  clothing: Shirt,
  retail: Package,
  technology: Plug,
  tools: Hammer,
  office: BriefcaseBusiness,
  pharmacy: Pill,
  automotive: Car,
  services: BriefcaseBusiness,
  supplies: Package,
  "general-product": Package
};

export function normalizeProductIcon(icon?: string | null): ProductIconId {
  return productIconOptions.some((option) => option.id === icon) ? icon as ProductIconId : "package";
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function suggestProductIcons(search: string) {
  const lower = normalizeSearch(search.trim());
  if (!lower) return productIconOptions;
  const scored = productIconOptions.map((option) => {
    const haystack = normalizeSearch([option.id, option.label, option.category, ...option.keywords].join(" "));
    const direct = haystack.includes(lower) ? 3 : 0;
    const keyword = option.keywords.some((item) => lower.includes(normalizeSearch(item)) || normalizeSearch(item).includes(lower)) ? 5 : 0;
    return { option, score: direct + keyword };
  });
  return scored.sort((a, b) => b.score - a.score).map((item) => item.option);
}

export default function ProductIcon({ icon, className = "h-5 w-5" }: { icon?: string | null; className?: string }) {
  const Icon = icons[normalizeProductIcon(icon)];
  return <Icon className={className} aria-hidden="true" />;
}
