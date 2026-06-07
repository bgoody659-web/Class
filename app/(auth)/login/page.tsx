import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase";
import AuthPanel from "@/components/auth/auth-panel";
import ThemeToggle from "@/components/theme/theme-toggle";

export default async function LoginPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/');

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_28%)]" />
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_480px]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-200">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white">C</span>
            CLASS SaaS Workspace
          </div>
          <div className="max-w-2xl space-y-5">
            <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">Operación premium para negocios físicos.</h1>
            <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-300">Centralizá tiendas, empleados, encargados, stock, tareas, eventos y ventas desde un workspace moderno y multi-tenant.</p>
          </div>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            {['Multi-tienda', 'Inventario real', 'Roles seguros'].map((item) => <div key={item} className="premium-card py-4 text-sm font-medium">{item}</div>)}
          </div>
        </section>

        <section className="premium-card space-y-6 p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-medium text-blue-600">Ingresar</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Bienvenido a CLASS</h2><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Los propietarios crean cuentas. Encargados y empleados ingresan con credenciales asignadas.</p></div>
            <ThemeToggle />
          </div>
          <AuthPanel />
        </section>
      </div>
    </main>
  );
}
