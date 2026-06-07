import { selectStore } from "@/app/actions";
import { requireUser } from "@/lib/server/auth";

export default async function StoreSelectorPage() {
  const { supabase, user } = await requireUser();
  const { data: stores } = await supabase.from("stores").select("id,name,address,logo_url").eq("owner_id", user.id).order("created_at");

  return <main className="min-h-screen bg-[var(--app-bg)] p-6 text-[var(--app-fg)] md:p-12"><section className="mx-auto max-w-5xl space-y-8"><div className="text-center"><p className="text-sm font-medium text-blue-600">CLASS Workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">¿Qué tienda querés administrar?</h1><p className="mt-2 text-zinc-500 dark:text-zinc-400">Cada tienda mantiene empleados, stock, eventos, tareas y contabilidad aislados.</p></div><div className="grid gap-4 md:grid-cols-3">{(stores ?? []).map((store) => <form key={store.id} action={selectStore}><input type="hidden" name="store_id" value={store.id} /><button className="premium-card w-full text-left"><div className="mb-4 grid h-14 w-14 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-emerald-400 text-white shadow-lg shadow-blue-500/20">{store.logo_url ? <img src={store.logo_url} alt="Logo" className="h-full w-full object-cover"/> : "🏪"}</div><p className="font-semibold">{store.name}</p><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{store.address}</p></button></form>)}<a href="/onboarding" className="premium-card flex min-h-44 flex-col justify-center text-left"><span className="text-3xl">＋</span><p className="mt-3 font-semibold">Crear nueva tienda</p><p className="text-sm text-zinc-500 dark:text-zinc-400">Abrí otro workspace operativo.</p></a></div></section></main>;
}
