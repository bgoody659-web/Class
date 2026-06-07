"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginWithPassword, registerOwner } from "@/app/actions";
import { useRouter } from "next/navigation";

const initial = { ok: false, message: "" };

function ClassPreloader() {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[var(--app-bg)]/90 backdrop-blur-2xl"><div className="text-center"><div className="mx-auto mb-4 grid h-20 w-20 animate-pulse place-items-center rounded-[1.75rem] bg-gradient-to-br from-blue-600 to-cyan-400 text-2xl font-bold text-white shadow-2xl shadow-blue-600/30">C</div><p className="text-sm font-semibold tracking-[0.35em] text-blue-600">CLASS</p><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Preparando tu workspace...</p></div></div>;
}

function Submit({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? <ClassPreloader /> : null}<button disabled={pending} className="premium-button w-full disabled:opacity-60">{pending ? "Ingresando a CLASS..." : text}</button></>;
}

export default function AuthPanel() {
  const [mode, setMode] = useState<"chooser" | "register" | "login">("chooser");
  const [registerState, registerAction] = useActionState(registerOwner, initial);
  const [loginState, loginAction] = useActionState(loginWithPassword, initial);
  const router = useRouter();

  useEffect(() => { if (registerState.ok || loginState.ok) router.push('/'); }, [registerState.ok, loginState.ok, router]);

  if (mode === "chooser") return <div className="grid gap-3"><button onClick={() => setMode("register")} className="min-h-16 rounded-2xl bg-blue-600 px-5 py-4 text-left font-medium leading-snug text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-500"><span className="block text-sm opacity-80">Soy propietario</span>Crear cuenta</button><button onClick={() => setMode("login")} className="min-h-16 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left font-medium leading-snug shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"><span className="block text-sm text-zinc-500 dark:text-zinc-400">Propietario, encargado o empleado</span>Iniciar sesión</button></div>;

  if (mode === "register") return (
    <form action={registerAction} className="space-y-3">
      <input name="full_name" required placeholder="Nombre completo" className="premium-input w-full" />
      <input type="email" name="email" required placeholder="Email" className="premium-input w-full" />
      <input type="password" name="password" required placeholder="Contraseña" className="premium-input w-full" />
      <input name="store_name" required placeholder="Nombre de tienda" className="premium-input w-full" />
      <input name="store_address" required placeholder="Dirección de tienda" className="premium-input w-full" />
      <Submit text="Crear cuenta owner" />
      {registerState.message ? <p className={`text-sm ${registerState.ok ? "text-emerald-500" : "text-rose-500"}`}>{registerState.message}</p> : null}
      <button type="button" onClick={() => setMode("chooser")} className="text-xs text-zinc-500 hover:text-blue-600">← Volver</button>
    </form>
  );

  return (
    <form action={loginAction} className="space-y-3">
      <input type="email" name="email" required placeholder="Email" className="premium-input w-full" />
      <input type="password" name="password" required placeholder="Contraseña" className="premium-input w-full" />
      <select name="role" defaultValue="owner" className="premium-input w-full">
        <option value="owner">Propietario</option>
        <option value="manager">Encargado</option>
        <option value="employee">Empleado</option>
      </select>
      <Submit text="Iniciar sesión" />
      {loginState.message ? <p className={`text-sm ${loginState.ok ? "text-emerald-500" : "text-rose-500"}`}>{loginState.message}</p> : null}
      <button type="button" onClick={() => setMode("chooser")} className="text-xs text-zinc-500 hover:text-blue-600">← Volver</button>
    </form>
  );
}
