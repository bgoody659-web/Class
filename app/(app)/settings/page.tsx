import AvatarUpload from "@/components/profile/avatar-upload";
import Sidebar from "@/components/dashboard/sidebar";
import ThemeToggle from "@/components/theme/theme-toggle";
import { updatePassword, updateProfile, updateStoreBranding } from "@/app/profile-actions";
import { resolveActiveStoreId } from "@/lib/server/store";

export default async function SettingsPage() {
  const { supabase, user, role, storeId, stores, activeStoreName, activeStoreLogo } = await resolveActiveStoreId();
  const [{ data: profile }, { data: store }] = await Promise.all([
    supabase.from("profiles").select("full_name,email,role,avatar_url").eq("id", user.id).single(),
    supabase.from("stores").select("name,address,description,logo_url").eq("id", storeId).single()
  ]);
  const [firstName, ...lastParts] = (profile?.full_name ?? "").split(" ");
  const canEditStore = role === "owner";

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] md:grid md:grid-cols-[280px_1fr]">
      <Sidebar role={role} activeStoreName={activeStoreName} activeStoreLogo={activeStoreLogo} />
      <section className="space-y-6 p-6 md:p-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-sm font-medium text-blue-600">Perfil y workspace</p><h2 className="text-3xl font-semibold tracking-tight">Configuración</h2><p className="text-zinc-500 dark:text-zinc-400">Gestioná tu identidad, seguridad, tema y branding de tienda.</p></div>
          <ThemeToggle />
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <form action={updateProfile} className="premium-card space-y-4">
            <div className="flex items-center gap-4"><div className="h-16 w-16 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/30 to-emerald-500/30">{profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-2xl text-blue-500">◌</div>}</div><div><h3 className="font-semibold">{profile?.full_name ?? "Usuario CLASS"}</h3><p className="text-sm text-zinc-500">{profile?.email}</p></div></div>
            <div className="grid gap-3 md:grid-cols-2"><input name="first_name" defaultValue={firstName ?? ""} className="premium-input" placeholder="Nombre" disabled /><input defaultValue={lastParts.join(" ")} className="premium-input" placeholder="Apellido" disabled /></div>
            <input name="full_name" defaultValue={profile?.full_name ?? ""} className="premium-input w-full" placeholder="Nombre completo" />
            <AvatarUpload name="avatar_url" initialValue={profile?.avatar_url} label="Foto de perfil" />
            <button className="premium-button">Guardar perfil</button>
          </form>
          <aside className="premium-card space-y-3"><h3 className="font-semibold">Información de cuenta</h3><p className="text-sm text-zinc-500">Rol: <span className="font-medium text-[var(--app-fg)]">{role}</span></p><p className="text-sm text-zinc-500">Tiendas propias: <span className="font-medium text-[var(--app-fg)]">{role === "owner" ? stores.length : "—"}</span></p><p className="text-sm text-zinc-500">Tienda asignada: <span className="font-medium text-[var(--app-fg)]">{activeStoreName}</span></p><form action={updatePassword} className="space-y-2 pt-4"><input type="password" name="password" minLength={6} className="premium-input w-full" placeholder="Nueva contraseña"/><button className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm dark:border-white/10">Cambiar password</button></form></aside>
        </section>

        {canEditStore ? <form action={updateStoreBranding} className="premium-card space-y-4"><div><p className="text-sm font-medium text-emerald-600">Branding de tienda activa</p><h3 className="text-xl font-semibold">{store?.name}</h3></div><div className="grid gap-3 md:grid-cols-2"><input name="name" defaultValue={store?.name ?? ""} className="premium-input" placeholder="Nombre tienda"/><input name="address" defaultValue={store?.address ?? ""} className="premium-input" placeholder="Dirección"/></div><input name="description" defaultValue={store?.description ?? ""} className="premium-input w-full" placeholder="Descripción"/><AvatarUpload name="logo_url" initialValue={store?.logo_url} label="Logo de tienda"/><button className="premium-button">Guardar branding</button></form> : null}
      </section>
    </main>
  );
}
