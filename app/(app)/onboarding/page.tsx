import { createStore } from "@/app/actions";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form action={createStore} className="glass rounded-2xl p-8 w-full max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold">Crear tienda</h1>
        <input name="name" placeholder="Nombre de tienda" className="w-full bg-black/30 rounded p-3" required />
        <input name="address" placeholder="Dirección" className="w-full bg-black/30 rounded p-3" required />
        <textarea name="description" placeholder="Descripción" className="w-full bg-black/30 rounded p-3" />
        <button className="bg-accent rounded px-4 py-2">Crear tienda</button>
      </form>
    </main>
  );
}
