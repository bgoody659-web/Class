"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, BriefcaseBusiness, CalendarDays, ClipboardList, FileWarning, PackageCheck, Settings, ShieldCheck, Store, Users } from "lucide-react";

const iconMap = { Panel: BarChart3, Tiendas: Store, Empleados: Users, Encargados: ShieldCheck, Tareas: ClipboardList, Inventario: Boxes, Eventos: CalendarDays, Finanzas: BriefcaseBusiness, Reportes: FileWarning, Pedidos: PackageCheck, Configuración: Settings };

export default function NavLinks({ items }: { items: readonly (readonly [string, string])[] }) {
  const pathname = usePathname();
  return <nav className="space-y-1.5 text-sm">{items.map(([href, label]) => { const active = pathname === href; const Icon = iconMap[label as keyof typeof iconMap] ?? BarChart3; return <Link key={href} href={href} className={`group flex items-center gap-3 rounded-2xl px-3 py-3 font-medium transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"}`}><Icon className={`h-5 w-5 ${active ? "text-white" : "text-zinc-500 group-hover:text-blue-600 dark:text-zinc-400"}`}/><span>{label}</span></Link>; })}</nav>;
}
